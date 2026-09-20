const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const feedbackController = require('./feedback.controller');

// Authenticated feedback submission from mobile app
router.post('/', authenticateToken, feedbackController.submitFeedback);

// Public contact form submission from web landing page (dispatches email & stores in DB)
router.post('/contact', feedbackController.handleContactSubmission);

module.exports = router;
