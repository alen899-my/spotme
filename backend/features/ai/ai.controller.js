const aiService = require('./ai.service');

/**
 * Controller to send message to Coach Spotty.
 */
async function chat(req, res) {
  try {
    const { message, session_id, split_id } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const data = await aiService.sendChatMessage(req.user.id, { message, session_id, split_id });
    return res.json(data);
  } catch (err) {
    console.error('POST /ai/chat error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process AI chat message' });
  }
}

/**
 * Controller to confirm or cancel a pending destructive tool action.
 * Body: { token: string, confirmed: boolean, session_id: string }
 */
async function confirmAction(req, res) {
  try {
    const { token, confirmed, session_id } = req.body || {};
    if (!token || !session_id) {
      return res.status(400).json({ error: 'token and session_id are required.' });
    }
    const data = await aiService.runConfirmedTool(req.user.id, session_id, token, confirmed !== false);
    return res.json(data);
  } catch (err) {
    console.error('POST /ai/actions/confirm error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to confirm action' });
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

/**
 * Controller to stream coaching reply via SSE.
 * POST /api/ai/chat/stream — events: token / done / error.
 * Falls back to a single full-text event when V2/streaming unavailable.
 */
async function streamChat(req, res) {
  try {
    const { message, session_id, split_id, taskKey } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const runner = require('./agent/runner');
    const out = await runner.runChatStream(
      req.user.id,
      { message, session_id, split_id, taskKey },
      (tok) => send('token', { token: tok })
    );
    send('done', { session_id: out.session_id, session_title: out.session_title, actions: out.actions || [] });
    return res.end();
  } catch (err) {
    console.error('POST /ai/chat/stream error:', err);
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || 'Stream failed' })}\n\n`);
      return res.end();
    } catch (_) {
      return res.status(500).json({ error: err.message || 'Failed to stream AI chat message' });
    }
  }
}

module.exports = {
  chat,
  streamChat,
  confirmAction,
  getSessions,
  getSessionMessages,
  deleteSession,
};
