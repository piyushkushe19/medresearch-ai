const logger = require('../utils/logger');

/**
 * Compute TF-IDF-like term frequency for relevance scoring
 */
function computeTermFrequency(text, terms) {
  if (!text || !terms?.length) return 0;
  const textLower = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const termLower = term.toLowerCase();
    const regex = new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = (textLower.match(regex) || []).length;
    if (matches > 0) {
      score += (1 + Math.log(matches)) / (1 + Math.log(textLower.split(/\s+/).length));
    }
  }
  return Math.min(1.0, score);
}

/**
 * Jaccard similarity between two keyword sets
 */
function jaccardSimilarity(setA, setB) {
  if (!setA?.length || !setB?.length) return 0;
  const a = new Set(setA.filter(s => typeof s === 'string').map(s => s.toLowerCase()));
  const b = new Set(setB.filter(s => typeof s === 'string').map(s => s.toLowerCase()));
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

/**
 * Cosine-like similarity using term vectors (lightweight, no ML model needed)
 */
function computeTextSimilarity(textA, textB) {
  if (!textA || !textB) return 0;

  const tokenize = t => t.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);

  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (!tokensA.length || !tokensB.length) return 0;

  const freqA = {};
  const freqB = {};
  tokensA.forEach(t => { freqA[t] = (freqA[t] || 0) + 1; });
  tokensB.forEach(t => { freqB[t] = (freqB[t] || 0) + 1; });

  const allTerms = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dotProduct = 0, magA = 0, magB = 0;

  for (const term of allTerms) {
    const a = freqA[term] || 0;
    const b = freqB[term] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

/**
 * Score a single paper against the query
 */
function scorePaper(paper, queryComponents) {
  const { disease, diseaseExpansions = [], intent, interventions = [], searchQueries } = queryComponents;
  const allTerms = [disease, ...diseaseExpansions, ...interventions].filter(Boolean);
  const modifiers = searchQueries?.modifiers || [];

  const titleAndAbstract = `${paper.title} ${paper.abstract}`;
  const keywords = (paper.keywords || []).filter(k => typeof k === 'string');

  // 1. Term frequency relevance (40%)
  const titleRelevance = computeTermFrequency(paper.title, allTerms) * 1.5; // title weighted higher
  const abstractRelevance = computeTermFrequency(paper.abstract, allTerms);
  const intentRelevance = computeTermFrequency(titleAndAbstract, modifiers) * 0.5;
  const termScore = Math.min(1.0, (titleRelevance + abstractRelevance + intentRelevance) / 3);

  // 2. Keyword overlap (20%)
  const keywordScore = jaccardSimilarity(keywords, allTerms.concat(modifiers));

  // 3. Source credibility (25%)
  const credibilityScore = paper.credibilityScore || 0.5;

  // 4. Recency (15%)
  const currentYear = new Date().getFullYear();
  const age = currentYear - (paper.year || currentYear);
  let recencyScore = 0;
  if (age <= 1) recencyScore = 1.0;
  else if (age <= 3) recencyScore = 0.85;
  else if (age <= 5) recencyScore = 0.7;
  else if (age <= 8) recencyScore = 0.5;
  else if (age <= 12) recencyScore = 0.3;
  else recencyScore = 0.1;

  // 5. Citation impact bonus (OpenAlex only)
  const citationBonus = paper.citedBy
    ? Math.min(0.2, Math.log10(paper.citedBy + 1) / 10)
    : 0;

  // Weighted final score
  const finalScore = (
    termScore * 0.40 +
    keywordScore * 0.20 +
    credibilityScore * 0.25 +
    recencyScore * 0.15
  ) + citationBonus;

  return {
    ...paper,
    relevanceScore: Math.min(1.0, finalScore),
    scoreBreakdown: {
      termRelevance: termScore,
      keywordOverlap: keywordScore,
      credibility: credibilityScore,
      recency: recencyScore,
    },
  };
}

/**
 * Deduplicate papers by title similarity and DOI
 */
function deduplicatePapers(papers) {
  const seen = new Map(); // doi -> paper
  const titleSeen = [];
  const unique = [];

  for (const paper of papers) {
    // DOI deduplication
    if (paper.doi && seen.has(paper.doi)) {
      const existing = seen.get(paper.doi);
      // Keep the one with higher credibility
      if (paper.credibilityScore > existing.credibilityScore) {
        const idx = unique.findIndex(p => p.doi === paper.doi);
        if (idx >= 0) unique[idx] = paper;
      }
      continue;
    }

    // Title deduplication (fuzzy)
    let isDuplicate = false;
    for (const seenTitle of titleSeen) {
      const similarity = computeTextSimilarity(paper.title, seenTitle);
      if (similarity > 0.85) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      if (paper.doi) seen.set(paper.doi, paper);
      titleSeen.push(paper.title);
      unique.push(paper);
    }
  }

  return unique;
}

/**
 * Ensure diversity across topics and sources
 */
function ensureDiversity(papers, topN = 8) {
  if (papers.length <= topN) return papers;

  const selected = [];
  const usedSources = {};
  const maxPerSource = Math.ceil(topN / 2);

  // First pass: select top papers with source diversity
  for (const paper of papers) {
    if (selected.length >= topN) break;
    const sourceCount = usedSources[paper.source] || 0;
    if (sourceCount < maxPerSource) {
      selected.push(paper);
      usedSources[paper.source] = sourceCount + 1;
    }
  }

  // Fill remaining slots if needed
  if (selected.length < topN) {
    for (const paper of papers) {
      if (selected.length >= topN) break;
      if (!selected.find(p => p.id === paper.id)) {
        selected.push(paper);
      }
    }
  }

  return selected;
}

/**
 * Main ranking pipeline
 */
function rankAndFilterPapers(allPapers, queryComponents, finalCount = 8) {
  logger.info(`Ranking ${allPapers.length} raw papers`);

  if (!allPapers.length) return [];

  // Score all papers
  const scored = allPapers.map(paper => scorePaper(paper, queryComponents));

  // Deduplicate
  const unique = deduplicatePapers(scored);
  logger.info(`After deduplication: ${unique.length} papers`);

  // Filter low quality
  const filtered = unique.filter(p => {
    const hasContent = p.title?.length > 10 && (p.abstract?.length > 50 || p.year > 1990);
    const isRelevant = p.relevanceScore > 0.05;
    return hasContent && isRelevant;
  });
  logger.info(`After quality filter: ${filtered.length} papers`);

  // Sort by relevance score
  filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Ensure diversity
  const diverse = ensureDiversity(filtered, finalCount);
  logger.info(`Final ranked papers: ${diverse.length}`);

  return diverse;
}

/**
 * Rank clinical trials
 */
function rankTrials(trials, finalCount = 5) {
  if (!trials.length) return [];

  return trials
    .filter(t => t.title?.length > 5)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, finalCount);
}

module.exports = { rankAndFilterPapers, rankTrials, scorePaper, deduplicatePapers };
