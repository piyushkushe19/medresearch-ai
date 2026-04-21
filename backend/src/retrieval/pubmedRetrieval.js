const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/logger');

const BASE_URL = process.env.PUBMED_BASE_URL || 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const API_KEY = process.env.PUBMED_API_KEY || '';
const MAX_RESULTS = parseInt(process.env.MAX_RAW_RESULTS_PER_SOURCE) || 100;

const axiosInstance = axios.create({
  timeout: 30000,
  headers: { 'User-Agent': 'MedicalResearchAssistant/1.0' },
});

/**
 * Search PubMed for article IDs
 */
async function searchPubMed(query, retmax = MAX_RESULTS) {
  const params = {
    db: 'pubmed',
    term: query,
    retmax,
    retmode: 'json',
    sort: 'relevance',
    usehistory: 'y',
    datetype: 'pdat',
    reldate: 3650, // Last 10 years
  };
  if (API_KEY) params.api_key = API_KEY;

  try {
    const response = await axiosInstance.get(`${BASE_URL}/esearch.fcgi`, { params });
    const data = response.data;
    const ids = data.esearchresult?.idlist || [];
    const count = parseInt(data.esearchresult?.count || 0);
    logger.info(`PubMed search: "${query}" → ${ids.length} IDs (total: ${count})`);
    return { ids, webEnv: data.esearchresult?.webenv, queryKey: data.esearchresult?.querykey, count };
  } catch (error) {
    logger.error(`PubMed search error: ${error.message}`);
    return { ids: [], count: 0 };
  }
}

/**
 * Fetch full article details for a batch of IDs
 */
async function fetchArticleDetails(ids) {
  if (!ids || ids.length === 0) return [];

  const batchSize = 20;
  const batches = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize));
  }

  const allArticles = [];

  for (const batch of batches) {
    try {
      const params = {
        db: 'pubmed',
        id: batch.join(','),
        retmode: 'xml',
        rettype: 'abstract',
      };
      if (API_KEY) params.api_key = API_KEY;

      const response = await axiosInstance.get(`${BASE_URL}/efetch.fcgi`, { params });
      const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false });

      const articles = parsed?.PubmedArticleSet?.PubmedArticle;
      if (!articles) continue;

      const articleList = Array.isArray(articles) ? articles : [articles];

      for (const article of articleList) {
        try {
          const medCitation = article.MedlineCitation;
          const articleData = medCitation?.Article;
          if (!articleData) continue;

          const pmid = medCitation?.PMID?._ || medCitation?.PMID;
          const title = articleData?.ArticleTitle?._ || articleData?.ArticleTitle || '';
          const abstractData = articleData?.Abstract?.AbstractText;
          let abstract = '';
          if (typeof abstractData === 'string') abstract = abstractData;
          else if (abstractData?._) abstract = abstractData._;
          else if (Array.isArray(abstractData)) abstract = abstractData.map(a => a._ || a).join(' ');

          // Authors
          const authorList = articleData?.AuthorList?.Author;
          const authors = [];
          if (authorList) {
            const authArray = Array.isArray(authorList) ? authorList : [authorList];
            for (const auth of authArray.slice(0, 6)) {
              const name = [auth.LastName, auth.ForeName].filter(Boolean).join(' ');
              if (name) authors.push(name);
            }
          }

          // Publication date
          const pubDate = articleData?.Journal?.JournalIssue?.PubDate;
          const year = pubDate?.Year || pubDate?.MedlineDate?.substring(0, 4) || 'Unknown';

          // Journal
          const journal = articleData?.Journal?.Title || articleData?.Journal?.ISOAbbreviation || '';

          // Keywords / MeSH
          const meshTerms = medCitation?.MeshHeadingList?.MeshHeading;
          const keywords = [];
          if (meshTerms) {
            const meshArray = Array.isArray(meshTerms) ? meshTerms : [meshTerms];
            meshArray.slice(0, 10).forEach(m => {
              const term = m?.DescriptorName?._ || m?.DescriptorName;
              if (term) keywords.push(term);
            });
          }

          // DOI
          const articleIds = article?.PubmedData?.ArticleIdList?.ArticleId;
          let doi = '';
          if (articleIds) {
            const idArray = Array.isArray(articleIds) ? articleIds : [articleIds];
            const doiId = idArray.find(id => id?.$?.IdType === 'doi');
            doi = doiId?._ || '';
          }

          allArticles.push({
            id: `pubmed_${pmid}`,
            pmid,
            title: title.replace(/(<([^>]+)>)/gi, '').trim(),
            abstract: abstract.replace(/(<([^>]+)>)/gi, '').trim(),
            authors,
            year: parseInt(year) || 0,
            journal,
            keywords,
            doi,
            url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
            source: 'PubMed',
            credibilityScore: computeCredibilityScore({ journal, authors, year }),
          });
        } catch (parseErr) {
          logger.warn(`Failed to parse article: ${parseErr.message}`);
        }
      }

      // Respect PubMed rate limit
      await new Promise(r => setTimeout(r, 350));
    } catch (error) {
      logger.error(`PubMed fetch batch error: ${error.message}`);
    }
  }

  return allArticles;
}

/**
 * Score credibility based on journal and publication context
 */
function computeCredibilityScore({ journal = '', authors = [], year = 0 }) {
  let score = 0.5; // baseline

  const highImpactJournals = [
    'nature', 'science', 'cell', 'nejm', 'new england journal',
    'lancet', 'jama', 'bmj', 'annals', 'pnas', 'nature medicine',
    'cancer', 'blood', 'circulation', 'brain', 'neurology',
  ];

  const journalLower = journal.toLowerCase();
  if (highImpactJournals.some(j => journalLower.includes(j))) score += 0.3;
  else if (journalLower.includes('journal') || journalLower.includes('review')) score += 0.15;

  // Recency bonus
  const currentYear = new Date().getFullYear();
  const age = currentYear - (year || currentYear);
  if (age <= 2) score += 0.2;
  else if (age <= 5) score += 0.1;
  else if (age > 15) score -= 0.1;

  // Author count suggests broader research
  if (authors.length >= 5) score += 0.05;

  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Main PubMed retrieval function
 */
async function retrieveFromPubMed(query, maxResults = MAX_RESULTS) {
  logger.info(`Starting PubMed retrieval for: "${query}"`);

  const { ids } = await searchPubMed(query, maxResults);
  if (ids.length === 0) {
    logger.warn('No PubMed results found');
    return [];
  }

  const articles = await fetchArticleDetails(ids.slice(0, maxResults));
  logger.info(`PubMed retrieved ${articles.length} articles`);
  return articles;
}

module.exports = { retrieveFromPubMed };
