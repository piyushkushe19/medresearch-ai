const logger = require('../utils/logger');

/**
 * Medical domain knowledge for query expansion
 */
const DISEASE_SYNONYMS = {
  'parkinson': ["Parkinson's disease", 'parkinsonism', 'PD', 'neurodegenerative movement disorder'],
  'alzheimer': ["Alzheimer's disease", 'AD', 'dementia', 'cognitive decline', 'neurodegeneration'],
  'cancer': ['neoplasm', 'malignancy', 'tumor', 'carcinoma', 'oncology'],
  'lung cancer': ['pulmonary carcinoma', 'NSCLC', 'SCLC', 'bronchogenic carcinoma', 'lung neoplasm'],
  'breast cancer': ['mammary carcinoma', 'breast neoplasm', 'BRCA', 'breast tumor'],
  'diabetes': ['diabetes mellitus', 'DM', 'T2DM', 'T1DM', 'hyperglycemia', 'insulin resistance'],
  'depression': ['major depressive disorder', 'MDD', 'clinical depression', 'unipolar depression'],
  'hypertension': ['high blood pressure', 'HTN', 'arterial hypertension', 'elevated blood pressure'],
  'covid': ['COVID-19', 'SARS-CoV-2', 'coronavirus', 'coronavirus disease'],
  'ms': ['multiple sclerosis', 'demyelinating disease', 'MS'],
  'stroke': ['cerebrovascular accident', 'CVA', 'ischemic stroke', 'brain infarction'],
  'heart disease': ['cardiovascular disease', 'coronary artery disease', 'CAD', 'heart failure', 'cardiac disease'],
};

const TREATMENT_KEYWORDS = ['treatment', 'therapy', 'intervention', 'clinical trial', 'drug', 'medication', 'surgery', 'procedure'];
const DIAGNOSTIC_KEYWORDS = ['diagnosis', 'biomarker', 'screening', 'detection', 'imaging', 'test', 'marker'];
const PROGNOSTIC_KEYWORDS = ['prognosis', 'survival', 'outcome', 'mortality', 'risk factor', 'prediction'];
const MECHANISM_KEYWORDS = ['mechanism', 'pathway', 'pathophysiology', 'etiology', 'cause', 'molecular'];

/**
 * Extract structured intent and entities from natural language query
 */
function extractQueryComponents(rawQuery) {
  const query = rawQuery.toLowerCase().trim();

  // Detect intent
  let intent = 'general';
  if (TREATMENT_KEYWORDS.some(k => query.includes(k))) intent = 'treatment';
  else if (DIAGNOSTIC_KEYWORDS.some(k => query.includes(k))) intent = 'diagnosis';
  else if (PROGNOSTIC_KEYWORDS.some(k => query.includes(k))) intent = 'prognosis';
  else if (MECHANISM_KEYWORDS.some(k => query.includes(k))) intent = 'mechanism';
  else if (query.includes('trial') || query.includes('study')) intent = 'clinical_trial';

  // Extract disease
  let disease = null;
  let diseaseExpansions = [];

  for (const [key, synonyms] of Object.entries(DISEASE_SYNONYMS)) {
    if (query.includes(key) || synonyms.some(s => query.toLowerCase().includes(s.toLowerCase()))) {
      disease = synonyms[0]; // Canonical name
      diseaseExpansions = synonyms;
      break;
    }
  }

  // If no disease found, try to extract noun phrases as potential disease names
  if (!disease) {
    const medicalPatterns = [
      /(?:treating|treatment of|therapy for|diagnosis of|study of|research on)\s+([a-z\s]+?)(?:\s+with|\s+using|\s+by|$)/i,
      /([a-z\s]+?)\s+(?:treatment|therapy|diagnosis|symptoms|causes|risk)/i,
    ];
    for (const pattern of medicalPatterns) {
      const match = rawQuery.match(pattern);
      if (match && match[1] && match[1].length > 3) {
        disease = match[1].trim();
        diseaseExpansions = [disease];
        break;
      }
    }
  }

  // If still no disease, use entire query as disease context
  if (!disease) {
    disease = rawQuery.trim();
    diseaseExpansions = [rawQuery.trim()];
  }

  // Extract location
  const locationPatterns = [
    /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    /(?:located in|based in|available in|recruiting in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  ];
  let location = null;
  for (const pattern of locationPatterns) {
    const match = rawQuery.match(pattern);
    if (match) { location = match[1]; break; }
  }

  // Extract specific treatments or interventions mentioned
  const interventions = [];
  const interventionPatterns = [
    /deep brain stimulation/i, /immunotherapy/i, /chemotherapy/i, /radiation/i,
    /gene therapy/i, /stem cell/i, /CAR-T/i, /checkpoint inhibitor/i,
    /vitamin [a-z]/i, /omega-3/i, /metformin/i, /aspirin/i,
  ];
  interventionPatterns.forEach(p => {
    const m = rawQuery.match(p);
    if (m) interventions.push(m[0]);
  });

  return { disease, diseaseExpansions, intent, location, interventions };
}

/**
 * Build expanded search queries for each data source
 */
function buildSearchQueries(components, conversationContext = null) {
  const { disease, diseaseExpansions, intent, interventions } = components;

  // Merge with conversation context if available
  const contextDisease = conversationContext?.disease || disease;
  const contextExpansions = conversationContext?.diseaseExpansions || diseaseExpansions;

  const primaryQuery = contextDisease;
  const expansionTerms = [...new Set([...contextExpansions, ...interventions])];

  // Build queries for different intents
  const intentModifiers = {
    treatment: ['treatment', 'therapy', 'intervention', 'clinical outcome'],
    diagnosis: ['diagnosis', 'biomarker', 'screening', 'detection'],
    prognosis: ['prognosis', 'survival rate', 'mortality', 'outcome'],
    mechanism: ['pathophysiology', 'mechanism', 'molecular pathway'],
    clinical_trial: ['randomized controlled trial', 'RCT', 'phase II', 'phase III'],
    general: ['research', 'study', 'review'],
  };

  const modifiers = intentModifiers[intent] || intentModifiers.general;

  return {
    pubmed: buildPubMedQuery(contextDisease, expansionTerms, modifiers),
    openAlex: buildOpenAlexQuery(contextDisease, expansionTerms, modifiers),
    clinicalTrials: buildClinicalTrialsQuery(contextDisease, interventions, components.location),
    primaryTerm: primaryQuery,
    allTerms: expansionTerms,
    modifiers,
  };
}

function buildPubMedQuery(disease, expansions, modifiers) {
  const diseaseTerms = expansions.slice(0, 3).map(t => `"${t}"`).join(' OR ');
  const modifierTerms = modifiers.slice(0, 2).map(m => `"${m}"`).join(' OR ');
  return `(${diseaseTerms}) AND (${modifierTerms})`;
}

function buildOpenAlexQuery(disease, expansions, modifiers) {
  return `${disease} ${modifiers[0] || ''}`.trim();
}

function buildClinicalTrialsQuery(disease, interventions, location) {
  return {
    condition: disease,
    intervention: interventions[0] || '',
    location: location || '',
  };
}

/**
 * Main query understanding pipeline
 */
async function understandQuery(rawQuery, conversationContext = null) {
  logger.info(`Query understanding: "${rawQuery}"`);

  const components = extractQueryComponents(rawQuery);
  logger.info(`Extracted: disease="${components.disease}", intent="${components.intent}"`);

  // Merge with conversation context for follow-up queries
  if (conversationContext?.disease && components.disease === rawQuery.trim()) {
    logger.info(`Using conversation context disease: ${conversationContext.disease}`);
    components.disease = conversationContext.disease;
    components.diseaseExpansions = conversationContext.diseaseExpansions || [conversationContext.disease];
  }

  const searchQueries = buildSearchQueries(components, conversationContext);

  return {
    original: rawQuery,
    disease: components.disease,
    diseaseExpansions: components.diseaseExpansions,
    intent: components.intent,
    location: components.location,
    interventions: components.interventions,
    searchQueries,
    isFollowUp: !!conversationContext?.disease,
  };
}

module.exports = { understandQuery, extractQueryComponents, buildSearchQueries };
