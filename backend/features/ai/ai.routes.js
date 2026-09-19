const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const aiController = require('./ai.controller');

// POST /api/ai/chat
router.post('/chat', authenticateToken, aiController.chat);

// GET /api/ai/sessions
router.get('/sessions', authenticateToken, aiController.getSessions);

// GET /api/ai/sessions/:id
router.get('/sessions/:id', authenticateToken, aiController.getSessionMessages);

// DELETE /api/ai/sessions/:id
router.delete('/sessions/:id', authenticateToken, aiController.deleteSession);

module.exports = router;
