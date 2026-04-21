const axios = require('axios');
const logger = require('../utils/logger');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const ollamaClient = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 120000, // 2 minutes for LLM generation
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Check if Ollama is available
 */
async function isOllamaAvailable() {
  try {
    const resp = await ollamaClient.get('/api/tags', { timeout: 5000 });
    const models = resp.data?.models || [];
    const hasModel = models.some(m => m.name?.includes(OLLAMA_MODEL.split(':')[0]));
    if (!hasModel) {
      logger.warn(`Model ${OLLAMA_MODEL} not found. Available: ${models.map(m => m.name).join(', ')}`);
    }
    return true;
  } catch {
    logger.warn('Ollama is not available. Using structured fallback.');
    return false;
  }
}

/**
 * Generate streaming text from Ollama
 */
async function generateWithOllama(prompt, options = {}) {
  const payload = {
    model: options.model || OLLAMA_MODEL,
    prompt,
    stream: false,
    options: {
      temperature: options.temperature || 0.3,
      top_p: options.top_p || 0.85,
      num_predict: options.maxTokens || 1500,
      stop: options.stop || [],
    },
  };

  try {
    const response = await ollamaClient.post('/api/generate', payload);
    return {
      text: response.data?.response || '',
      done: response.data?.done || false,
      model: response.data?.model,
    };
  } catch (error) {
    logger.error(`Ollama generate error: ${error.message}`);
    throw new Error(`LLM generation failed: ${error.message}`);
  }
}

/**
 * Build medical reasoning prompt - grounded ONLY in retrieved data
 */
function buildMedicalReasoningPrompt(queryComponents, papers, trials, conversationHistory = []) {
  const { disease, intent, original } = queryComponents;

  // Format research papers for context
  const papersContext = papers.slice(0, 6).map((p, i) => `
[PAPER ${i + 1}]
Title: ${p.title}
Authors: ${p.authors?.join(', ') || 'N/A'}
Year: ${p.year || 'N/A'}
Journal: ${p.journal || 'N/A'}
Source: ${p.source}
Abstract: ${p.abstract?.slice(0, 400) || 'No abstract available.'}
URL: ${p.url}
---`).join('\n');

  // Format clinical trials for context
  const trialsContext = trials.slice(0, 4).map((t, i) => `
[TRIAL ${i + 1}]
Title: ${t.title}
NCT ID: ${t.nctId}
Status: ${t.status}
Phase: ${t.phase || 'N/A'}
Summary: ${t.summary?.slice(0, 300) || 'N/A'}
Eligibility: ${t.eligibility?.criteria?.slice(0, 200) || 'N/A'}
Location: ${t.locations?.[0] ? `${t.locations[0].city || ''}, ${t.locations[0].country || ''}` : 'N/A'}
URL: ${t.url}
---`).join('\n');

  // Conversation context
  const historyContext = conversationHistory.length > 0
    ? `\nPREVIOUS CONVERSATION:\n${conversationHistory.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 200)}`).join('\n')}\n`
    : '';

  return `You are a medical research reasoning system. Your task is to generate a structured, evidence-based medical research summary.

CRITICAL RULES:
1. ONLY use information from the RETRIEVED PAPERS and CLINICAL TRIALS below
2. Do NOT hallucinate medical facts, statistics, or claims not present in the sources
3. If the papers do not contain certain information, explicitly state "not found in retrieved literature"
4. Always cite which paper or trial supports each claim (use [PAPER N] or [TRIAL N])
5. Be precise, scientific, and cautious in language
6. Do NOT provide medical advice - this is for research purposes only
${historyContext}
USER QUERY: "${original}"
CONDITION: ${disease}
INTENT: ${intent}

=== RETRIEVED RESEARCH PAPERS ===
${papersContext || 'No papers retrieved.'}

=== RETRIEVED CLINICAL TRIALS ===
${trialsContext || 'No trials retrieved.'}

=== YOUR TASK ===
Generate a structured medical research summary with EXACTLY these sections:

## CONDITION OVERVIEW
Briefly describe ${disease} based ONLY on what appears in the retrieved papers. 2-3 sentences.

## KEY RESEARCH FINDINGS
Summarize the most important findings from the papers. For each finding:
- State the finding clearly
- Cite the source [PAPER N]
- Note any limitations or caveats mentioned
List 3-5 distinct findings.

## CLINICAL TRIAL INSIGHTS
Based on the retrieved trials:
- Summarize what is being studied
- Note the phases and recruitment status
- Highlight eligibility criteria relevant to the query
Cite [TRIAL N] for each point.

## AI REASONED ANALYSIS
Synthesize the research and trials to address: "${original}"
- What does the current evidence suggest?
- What are the gaps or areas of ongoing research?
- What are the key considerations?
Keep this grounded in the retrieved sources only.

## IMPORTANT DISCLAIMER
[Always include: "This analysis is based solely on retrieved research literature and is intended for research purposes only. It does not constitute medical advice. Consult a qualified healthcare provider for medical decisions."]

Begin your response now:`;
}

/**
 * Structured fallback when Ollama is unavailable
 */
function generateStructuredFallback(queryComponents, papers, trials) {
  const { disease, intent, original } = queryComponents;

  const findingsList = papers.slice(0, 5).map((p, i) =>
    `• [Paper ${i + 1}] ${p.title} (${p.year || 'N/A'}) — ${p.abstract?.slice(0, 150) || 'See source for details.'}...`
  ).join('\n');

  const trialsList = trials.slice(0, 4).map((t, i) =>
    `• [Trial ${i + 1}] ${t.title} | Status: ${t.status} | Phase: ${t.phase || 'N/A'}`
  ).join('\n');

  return `## CONDITION OVERVIEW
Based on ${papers.length} retrieved research papers and ${trials.length} clinical trials for "${disease}".

## KEY RESEARCH FINDINGS
${findingsList || 'No papers retrieved for this query. Try broadening your search terms.'}

## CLINICAL TRIAL INSIGHTS
${trialsList || 'No relevant clinical trials found for this condition and intent.'}

## AI REASONED ANALYSIS
This summary is based on ${papers.length} retrieved research papers from PubMed and OpenAlex, and ${trials.length} clinical trials from ClinicalTrials.gov. The local LLM (Ollama) is currently unavailable. The retrieved literature above represents the current state of research on "${disease}" with intent "${intent}". Review each source directly for detailed information.

Note: For full AI-powered reasoning, ensure Ollama is running with: \`ollama run ${OLLAMA_MODEL}\`

## IMPORTANT DISCLAIMER
This analysis is based solely on retrieved research literature and is intended for research purposes only. It does not constitute medical advice. Consult a qualified healthcare provider for medical decisions.`;
}

/**
 * Main LLM reasoning function
 */
async function generateMedicalInsights(queryComponents, papers, trials, conversationHistory = []) {
  logger.info('Starting LLM reasoning pipeline');

  if (papers.length === 0 && trials.length === 0) {
    return {
      text: `No research literature or clinical trials were retrieved for your query about "${queryComponents.disease}". Please try a different search term or check your API connectivity.`,
      model: 'fallback',
      usedLLM: false,
    };
  }

  const ollamaAvailable = await isOllamaAvailable();

  if (!ollamaAvailable) {
    logger.info('Using structured fallback (Ollama unavailable)');
    return {
      text: generateStructuredFallback(queryComponents, papers, trials),
      model: 'structured-fallback',
      usedLLM: false,
    };
  }

  const prompt = buildMedicalReasoningPrompt(queryComponents, papers, trials, conversationHistory);

  try {
    logger.info(`Generating insights with ${OLLAMA_MODEL}`);
    const result = await generateWithOllama(prompt, {
      temperature: 0.2, // Low temperature for factual accuracy
      maxTokens: 2000,
    });

    logger.info(`LLM generation complete (${result.text?.length || 0} chars)`);
    return {
      text: result.text || generateStructuredFallback(queryComponents, papers, trials),
      model: OLLAMA_MODEL,
      usedLLM: true,
    };
  } catch (error) {
    logger.error(`LLM reasoning failed: ${error.message}`);
    return {
      text: generateStructuredFallback(queryComponents, papers, trials),
      model: 'structured-fallback',
      usedLLM: false,
      error: error.message,
    };
  }
}

module.exports = { generateMedicalInsights, isOllamaAvailable };
