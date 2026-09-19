const express = require('express');
const authenticateToken = require('../../middleware/auth');
const updatesController = require('./updates.controller');

const router = express.Router();

router.get('/latest', authenticateToken, updatesController.getLatest);

module.exports = router;
