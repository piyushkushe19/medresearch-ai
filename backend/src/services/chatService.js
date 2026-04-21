const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { runResearchPipeline } = require('./researchPipeline');

// In-memory session store (falls back gracefully if MongoDB unavailable)
const sessions = new Map();

let Conversation;
try {
  Conversation = require('../models/Conversation');
} catch {
  logger.warn('Conversation model unavailable - using in-memory sessions only');
}

/**
 * Create or retrieve session
 */
async function getOrCreateSession(sessionId) {
  // Try MongoDB first
  if (Conversation) {
    try {
      let conv = await Conversation.findOne({ sessionId });
      if (!conv) {
        conv = new Conversation({ sessionId, messages: [], context: {} });
        await conv.save();
      }
      return conv;
    } catch (err) {
      logger.warn(`MongoDB session unavailable: ${err.message}. Using in-memory.`);
    }
  }

  // Fallback to in-memory
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { sessionId, messages: [], context: {} });
  }
  return sessions.get(sessionId);
}

/**
 * Save session (MongoDB or in-memory)
 */
async function saveSession(session) {
  if (Conversation && session.save) {
    try {
      await session.save();
    } catch (err) {
      logger.warn(`Session save failed: ${err.message}`);
    }
  } else {
    sessions.set(session.sessionId, session);
  }
}

/**
 * Detect if a message is a follow-up vs new topic
 */
function detectQueryType(currentQuery, context) {
  if (!context?.disease) return 'new';

  const followUpIndicators = [
    /^(what about|how about|and|also|tell me more|more on|regarding|concerning)/i,
    /^(can you|could you|would|does|do|is|are|was|were)/i,
    /^(vitamin|supplement|drug|medication|treatment|therapy|dose|dosage)/i,
  ];

  const isFollowUp = followUpIndicators.some(p => p.test(currentQuery.trim()));

  // If very short query without disease mention, likely follow-up
  const diseaseStr = typeof context.disease === 'string' ? context.disease : '';
  const diseaseTerms = diseaseStr.toLowerCase().split(/\s+/);
  const queryLower = currentQuery.toLowerCase();
  const mentionsDisease = diseaseTerms.some(t => t.length > 3 && queryLower.includes(t));

  if (currentQuery.trim().split(/\s+/).length < 5 && !mentionsDisease) {
    return 'followup';
  }

  return isFollowUp ? 'followup' : 'new';
}

/**
 * Process a chat message
 */
async function processChat(sessionId, userMessage) {
  logger.info(`Chat [${sessionId}]: "${userMessage}"`);

  const session = await getOrCreateSession(sessionId);
  const messages = session.messages || [];
  const context = session.context || {};

  // Detect query type
  const queryType = detectQueryType(userMessage, context);
  logger.info(`Query type: ${queryType}, existing context: ${context.disease || 'none'}`);

  // Build conversation context for follow-ups
  const conversationContext = queryType === 'followup' && context.disease
    ? {
        disease: context.disease,
        diseaseExpansions: context.diseaseExpansions || [context.disease],
        intent: context.intent,
      }
    : null;

  // Get conversation history for LLM context
  const conversationHistory = messages.slice(-8).map(m => ({
    role: m.role,
    content: m.content,
  }));

  // Run research pipeline
  const result = await runResearchPipeline(userMessage, conversationContext, conversationHistory);

  // Update session context with new information
  if (queryType === 'new' || !context.disease) {
    session.context = {
      disease: result.query.disease,
      diseaseExpansions: result.query.diseaseExpansions,
      intent: result.query.intent,
      location: result.query.location,
      previousQueries: [...(context.previousQueries || []), userMessage].slice(-10),
    };
  } else {
    // Keep existing disease context, update intent and previous queries
    session.context = {
      ...context,
      intent: result.query.intent,
      previousQueries: [...(context.previousQueries || []), userMessage].slice(-10),
    };
  }

  // Add messages to session
  const userMsg = {
    role: 'user',
    content: userMessage,
    timestamp: new Date(),
    metadata: {
      queryType,
      disease: result.query.disease,
      intent: result.query.intent,
    },
  };

  const assistantMsg = {
    role: 'assistant',
    content: result.aiSummary,
    timestamp: new Date(),
    metadata: {
      disease: result.query.disease,
      intent: result.query.intent,
      papersRetrieved: result.metadata.finalPapers,
      trialsRetrieved: result.metadata.finalTrials,
    },
  };

  messages.push(userMsg, assistantMsg);
  session.messages = messages.slice(-50); // Keep last 50 messages

  await saveSession(session);

  return {
    sessionId,
    result,
    queryType,
    messageCount: session.messages.length,
  };
}

/**
 * Get session history
 */
async function getSessionHistory(sessionId) {
  const session = await getOrCreateSession(sessionId);
  return {
    sessionId,
    messages: session.messages || [],
    context: session.context || {},
    messageCount: (session.messages || []).length,
  };
}

/**
 * Clear session
 */
async function clearSession(sessionId) {
  if (Conversation) {
    try {
      await Conversation.deleteOne({ sessionId });
    } catch {}
  }
  sessions.delete(sessionId);
  return { cleared: true };
}

module.exports = { processChat, getSessionHistory, clearSession };
