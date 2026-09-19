'use strict';

const express = require('express');
const router = express.Router();
const monitoringController = require('./monitoring.controller');
const authenticateAdmin = require('../../middleware/adminAuth');

// Public lightweight health & liveness probe for the frontend watchdog
router.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

// Protected Real-Time Telemetry & APM Endpoints
router.get('/realtime', authenticateAdmin, monitoringController.getRealtime);
router.get('/history', authenticateAdmin, monitoringController.getHistory);
router.post('/benchmark', authenticateAdmin, monitoringController.pingBenchmark);
router.post('/reset-peaks', authenticateAdmin, monitoringController.resetPeaks);

module.exports = router;
