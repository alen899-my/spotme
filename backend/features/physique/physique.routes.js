const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const upload = require('../../utils/upload');
const physiqueController = require('./physique.controller');

// GET /api/physique — List all analyses for current user
router.get('/', authenticateToken, physiqueController.getPhysiqueAnalyses);

// POST /api/physique/analyze — Upload photo + run AI analysis
router.post('/analyze', authenticateToken, upload.single('photo'), physiqueController.analyzePhoto);

// DELETE /api/physique/:id — Soft-delete an analysis
router.delete('/:id', authenticateToken, physiqueController.deletePhysiqueAnalysis);

module.exports = router;
