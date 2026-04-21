const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { processChat, getSessionHistory, clearSession } = require('../services/chatService');
const logger = require('../utils/logger');

/**
 * POST /api/chat
 * Send a message and get research results
 */
router.post('/', async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length < 2) {
      return res.status(400).json({ error: 'Message must be a non-empty string' });
    }

    // Create session if not provided
    const sid = sessionId || uuidv4();

    logger.info(`POST /api/chat [session: ${sid}]: "${message.slice(0, 50)}..."`);
    const result = await processChat(sid, message.trim());

    res.json({
      success: true,
      sessionId: sid,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chat/:sessionId/history
 * Get conversation history
 */
router.get('/:sessionId/history', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const history = await getSessionHistory(sessionId);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/chat/:sessionId
 * Clear a session
 */
router.delete('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await clearSession(sessionId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chat/new
 * Create a new session
 */
router.post('/new', (req, res) => {
  const sessionId = uuidv4();
  res.json({ success: true, sessionId });
});

module.exports = router;
