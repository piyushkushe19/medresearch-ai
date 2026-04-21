const express = require('express');
const router = express.Router();
const { retrieveFromClinicalTrials } = require('../retrieval/clinicalTrialsRetrieval');
const { rankTrials } = require('../retrieval/rankingEngine');
const { understandQuery } = require('../services/queryUnderstanding');

router.get('/', async (req, res, next) => {
  try {
    const { q, location, limit = 5 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
    const queryComponents = await understandQuery(q);
    if (location) queryComponents.location = location;
    const trials = await retrieveFromClinicalTrials(queryComponents, 50);
    const ranked = rankTrials(trials, parseInt(limit) || 5);
    res.json({ success: true, data: { query: queryComponents, trials: ranked, total: ranked.length, rawCount: trials.length } });
  } catch (error) { next(error); }
});

module.exports = router;
