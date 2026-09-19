const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const weightController = require('./weight.controller');

// POST /api/weight — log a new weight entry
router.post('/', authenticateToken, weightController.logWeight);

// GET /api/weight — get all weight entries for user
router.get('/', authenticateToken, weightController.getWeightLogs);

// DELETE /api/weight/:id — delete a weight entry
router.delete('/:id', authenticateToken, weightController.deleteWeightLog);

module.exports = router;
