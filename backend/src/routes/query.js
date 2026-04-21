const express = require('express');
const router = express.Router();
const { runResearchPipeline } = require('../services/researchPipeline');
const { understandQuery } = require('../services/queryUnderstanding');
const logger = require('../utils/logger');

/**
 * POST /api/query
 * Main research pipeline endpoint
 */
router.post('/', async (req, res, next) => {
  try {
    const { query, context } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return res.status(400).json({ error: 'Query must be a non-empty string of at least 3 characters' });
    }

    if (query.trim().length > 500) {
      return res.status(400).json({ error: 'Query too long. Maximum 500 characters.' });
    }

    logger.info(`POST /api/query: "${query}"`);
    const result = await runResearchPipeline(query.trim(), context || null, []);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/query/understand
 * Just parse the query without running full pipeline
 */
router.get('/understand', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

    const components = await understandQuery(q);
    res.json({ success: true, data: components });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
