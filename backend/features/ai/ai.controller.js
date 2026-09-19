const aiService = require('./ai.service');

/**
 * Controller to send message to Coach Spotty.
 */
async function chat(req, res) {
  try {
    const { message, session_id } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const data = await aiService.sendChatMessage(req.user.id, { message, session_id });
    return res.json(data);
  } catch (err) {
    console.error('POST /ai/chat error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process AI chat message' });
  }
}

/**
 * Controller to list user's chat sessions.
 */
async function getSessions(req, res) {
  try {
    const rows = await aiService.getChatSessions(req.user.id);
    return res.json(rows);
  } catch (err) {
    console.error('GET /ai/sessions error:', err);
    return res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
}

/**
 * Controller to get messages for a session.
 */
async function getSessionMessages(req, res) {
  try {
    const data = await aiService.getSessionMessages(req.user.id, req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json(data);
  } catch (err) {
    console.error('GET /ai/sessions/:id error:', err);
    return res.status(500).json({ error: 'Failed to fetch session messages' });
  }
}

/**
 * Controller to delete a session.
 */
async function deleteSession(req, res) {
  try {
    await aiService.deleteChatSession(req.user.id, req.params.id);
    return res.json({ success: true, message: 'Session deleted' });
  } catch (err) {
    console.error('DELETE /ai/sessions/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete session' });
  }
}

module.exports = {
  chat,
  getSessions,
  getSessionMessages,
  deleteSession,
};
