const axios = require('axios');
const logger = require('../utils/logger');

const BASE_URL = process.env.OPENALEX_BASE_URL || 'https://api.openalex.org';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'research@example.com';
const MAX_RESULTS = parseInt(process.env.MAX_RAW_RESULTS_PER_SOURCE) || 100;

const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': `MedicalResearchAssistant/1.0 (mailto:${CONTACT_EMAIL})`,
  },
  params: {
    mailto: CONTACT_EMAIL,
  },
});

/**
 * Fetch works from OpenAlex API with pagination
 */
async function fetchOpenAlexPage(query, page = 1, perPage = 50) {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/works`, {
      params: {
        search: query,
        filter: 'is_oa:true,type:article',
        sort: 'relevance_score:desc',
        'per-page': perPage,
        page,
        select: [
          'id', 'title', 'abstract_inverted_index', 'authorships',
          'publication_year', 'cited_by_count', 'primary_location',
          'open_access', 'doi', 'keywords', 'concepts', 'type',
          'referenced_works_count', 'biblio',
        ].join(','),
      },
    });

    return response.data;
  } catch (error) {
    logger.error(`OpenAlex fetch error (page ${page}): ${error.message}`);
    return null;
  }
}

/**
 * Reconstruct abstract from inverted index (OpenAlex format)
 */
function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return '';
  try {
    const wordPositions = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        wordPositions.push({ word, pos });
      }
    }
    wordPositions.sort((a, b) => a.pos - b.pos);
    return wordPositions.map(wp => wp.word).join(' ');
  } catch {
    return '';
  }
}

/**
 * Parse OpenAlex work into normalized format
 */
function parseOpenAlexWork(work) {
  if (!work?.title) return null;

  const authors = (work.authorships || [])
    .slice(0, 6)
    .map(a => a?.author?.display_name)
    .filter(Boolean);

  const journal = work.primary_location?.source?.display_name || '';
  const doi = work.doi || '';
  const year = work.publication_year || 0;
  const citedBy = work.cited_by_count || 0;
  const abstract = reconstructAbstract(work.abstract_inverted_index);

  // Concepts/keywords
  const concepts = (work.concepts || [])
    .filter(c => c.score > 0.3)
    .slice(0, 8)
    .map(c => c.display_name);

  const keywords = [...concepts, ...(work.keywords || []).map(k => k.keyword || k)].slice(0, 10);

  const openAlexId = work.id?.replace('https://openalex.org/', '');

  return {
    id: `openalex_${openAlexId}`,
    openAlexId,
    title: work.title.trim(),
    abstract: abstract.trim(),
    authors,
    year,
    journal,
    keywords,
    doi,
    citedBy,
    url: doi ? `https://doi.org/${doi.replace('https://doi.org/', '')}` : `https://openalex.org/${openAlexId}`,
    source: 'OpenAlex',
    isOpenAccess: work.open_access?.is_oa || false,
    credibilityScore: computeCredibilityScore({ journal, authors, year, citedBy }),
  };
}

/**
 * Compute credibility score using OpenAlex-specific signals
 */
function computeCredibilityScore({ journal = '', authors = [], year = 0, citedBy = 0 }) {
  let score = 0.4;

  const highImpactJournals = [
    'nature', 'science', 'cell', 'new england', 'lancet', 'jama', 'bmj',
    'pnas', 'annals', 'circulation', 'blood', 'brain', 'cancer research',
    'journal of clinical oncology', 'neurology', 'gut',
  ];

  const journalLower = journal.toLowerCase();
  if (highImpactJournals.some(j => journalLower.includes(j))) score += 0.25;

  // Citation score (log-scaled)
  if (citedBy > 500) score += 0.25;
  else if (citedBy > 100) score += 0.15;
  else if (citedBy > 20) score += 0.08;
  else if (citedBy > 5) score += 0.04;

  // Recency
  const currentYear = new Date().getFullYear();
  const age = currentYear - (year || currentYear);
  if (age <= 2) score += 0.15;
  else if (age <= 5) score += 0.08;
  else if (age > 15) score -= 0.08;

  if (authors.length >= 5) score += 0.05;

  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Main OpenAlex retrieval function
 */
async function retrieveFromOpenAlex(query, maxResults = MAX_RESULTS) {
  logger.info(`Starting OpenAlex retrieval for: "${query}"`);

  const allWorks = [];
  const perPage = 50;
  const pagesToFetch = Math.ceil(Math.min(maxResults, 200) / perPage);

  for (let page = 1; page <= pagesToFetch; page++) {
    const data = await fetchOpenAlexPage(query, page, perPage);
    if (!data?.results?.length) break;

    const parsed = data.results
      .map(parseOpenAlexWork)
      .filter(Boolean);
    allWorks.push(...parsed);

    // Rate limit
    await new Promise(r => setTimeout(r, 200));

    if (allWorks.length >= maxResults) break;
  }

  logger.info(`OpenAlex retrieved ${allWorks.length} works`);
  return allWorks.slice(0, maxResults);
}

module.exports = { retrieveFromOpenAlex };
