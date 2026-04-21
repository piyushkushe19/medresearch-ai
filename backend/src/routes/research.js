const express = require('express');
const router = express.Router();
const { retrieveFromPubMed } = require('../retrieval/pubmedRetrieval');
const { retrieveFromOpenAlex } = require('../retrieval/openAlexRetrieval');
const { rankAndFilterPapers } = require('../retrieval/rankingEngine');
const { understandQuery } = require('../services/queryUnderstanding');

router.get('/', async (req, res, next) => {
  try {
    const { q, source = 'all', limit = 8 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
    const queryComponents = await understandQuery(q);
    const { pubmed, openAlex } = queryComponents.searchQueries;
    let papers = [];
    if (source === 'pubmed' || source === 'all') {
      papers.push(...await retrieveFromPubMed(pubmed, 50));
    }
    if (source === 'openalex' || source === 'all') {
      papers.push(...await retrieveFromOpenAlex(openAlex, 50));
    }
    const ranked = rankAndFilterPapers(papers, queryComponents, parseInt(limit) || 8);
    res.json({ success: true, data: { query: queryComponents, papers: ranked, total: ranked.length, rawCount: papers.length } });
  } catch (error) { next(error); }
});

module.exports = router;
