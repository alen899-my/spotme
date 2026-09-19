const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const feedbackController = require('./feedback.controller');

router.post('/', authenticateToken, feedbackController.submitFeedback);

module.exports = router;
