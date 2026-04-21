const NodeCache = require('node-cache');
const logger = require('../utils/logger');
const { understandQuery } = require('./queryUnderstanding');
const { retrieveFromPubMed } = require('../retrieval/pubmedRetrieval');
const { retrieveFromOpenAlex } = require('../retrieval/openAlexRetrieval');
const { retrieveFromClinicalTrials } = require('../retrieval/clinicalTrialsRetrieval');
const { rankAndFilterPapers, rankTrials } = require('../retrieval/rankingEngine');
const { generateMedicalInsights } = require('../ai/ollamaService');

const FINAL_PAPERS = parseInt(process.env.FINAL_PAPERS_COUNT) || 8;
const FINAL_TRIALS = parseInt(process.env.FINAL_TRIALS_COUNT) || 5;
const MAX_RAW = parseInt(process.env.MAX_RAW_RESULTS_PER_SOURCE) || 100;

// Cache to avoid redundant API calls
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 3600 });

/**
 * Run parallel retrieval from all sources
 */
async function runParallelRetrieval(queryComponents) {
  const cacheKey = `retrieval_${JSON.stringify(queryComponents.searchQueries).slice(0, 200)}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    logger.info('Serving retrieval from cache');
    return cached;
  }

  logger.info('Starting parallel retrieval from all sources...');
  const startTime = Date.now();

  const { pubmed, openAlex } = queryComponents.searchQueries;

  // Run all three in parallel
  const [pubmedResults, openAlexResults, clinicalTrialsResults] = await Promise.allSettled([
    retrieveFromPubMed(pubmed, MAX_RAW),
    retrieveFromOpenAlex(openAlex, MAX_RAW),
    retrieveFromClinicalTrials(queryComponents, 50),
  ]);

  const papers = [
    ...(pubmedResults.status === 'fulfilled' ? pubmedResults.value : []),
    ...(openAlexResults.status === 'fulfilled' ? openAlexResults.value : []),
  ];

  const trials = clinicalTrialsResults.status === 'fulfilled' ? clinicalTrialsResults.value : [];

  if (pubmedResults.status === 'rejected') logger.error(`PubMed failed: ${pubmedResults.reason}`);
  if (openAlexResults.status === 'rejected') logger.error(`OpenAlex failed: ${openAlexResults.reason}`);
  if (clinicalTrialsResults.status === 'rejected') logger.error(`ClinicalTrials failed: ${clinicalTrialsResults.reason}`);

  const elapsed = Date.now() - startTime;
  logger.info(`Parallel retrieval complete in ${elapsed}ms: ${papers.length} papers, ${trials.length} trials`);

  const result = { papers, trials, elapsed };
  cache.set(cacheKey, result);
  return result;
}

/**
 * Full research pipeline
 */
async function runResearchPipeline(rawQuery, conversationContext = null, conversationHistory = []) {
  const pipelineStart = Date.now();
  logger.info(`=== Research Pipeline Start: "${rawQuery}" ===`);

  // Step 1: Query Understanding
  const queryComponents = await understandQuery(rawQuery, conversationContext);
  logger.info(`Query understood: disease="${queryComponents.disease}", intent="${queryComponents.intent}"`);

  // Step 2: Parallel Retrieval (50-300 raw results)
  const { papers: rawPapers, trials: rawTrials, elapsed: retrievalTime } = await runParallelRetrieval(queryComponents);

  // Step 3: Ranking & Filtering
  const rankedPapers = rankAndFilterPapers(rawPapers, queryComponents, FINAL_PAPERS);
  const rankedTrials = rankTrials(rawTrials, FINAL_TRIALS);

  logger.info(`Final: ${rankedPapers.length} papers, ${rankedTrials.length} trials (from ${rawPapers.length} raw)`);

  // Step 4: LLM Reasoning
  const llmResult = await generateMedicalInsights(
    queryComponents,
    rankedPapers,
    rankedTrials,
    conversationHistory
  );

  // Step 5: Build structured response
  const response = {
    query: queryComponents,
    papers: rankedPapers.map(sanitizePaper),
    trials: rankedTrials.map(sanitizeTrial),
    aiSummary: llmResult.text,
    metadata: {
      totalRawPapers: rawPapers.length,
      totalRawTrials: rawTrials.length,
      finalPapers: rankedPapers.length,
      finalTrials: rankedTrials.length,
      llmModel: llmResult.model,
      usedLLM: llmResult.usedLLM,
      retrievalTimeMs: retrievalTime,
      totalTimeMs: Date.now() - pipelineStart,
      sources: [...new Set(rankedPapers.map(p => p.source))],
    },
  };

  logger.info(`=== Pipeline Complete: ${response.metadata.totalTimeMs}ms ===`);
  return response;
}

/**
 * Sanitize paper for response (remove internal scoring details)
 */
function sanitizePaper(paper) {
  return {
    id: paper.id,
    title: paper.title,
    abstract: paper.abstract?.slice(0, 600) || '',
    authors: paper.authors || [],
    year: paper.year,
    journal: paper.journal || '',
    keywords: paper.keywords?.slice(0, 8) || [],
    doi: paper.doi || '',
    url: paper.url,
    source: paper.source,
    isOpenAccess: paper.isOpenAccess || false,
    citedBy: paper.citedBy || 0,
    relevanceScore: Math.round((paper.relevanceScore || 0) * 100),
  };
}

/**
 * Sanitize trial for response
 */
function sanitizeTrial(trial) {
  return {
    id: trial.id,
    nctId: trial.nctId,
    title: trial.title,
    status: trial.status,
    phase: trial.phase || 'N/A',
    summary: trial.summary || '',
    eligibility: trial.eligibility,
    locations: trial.locations || [],
    contact: trial.contact,
    sponsor: trial.sponsor || '',
    startDate: trial.startDate || '',
    completionDate: trial.completionDate || '',
    primaryOutcomes: trial.primaryOutcomes || [],
    interventions: trial.interventions || [],
    url: trial.url,
    source: trial.source,
    relevanceScore: Math.round((trial.relevanceScore || 0) * 100),
  };
}

module.exports = { runResearchPipeline };
