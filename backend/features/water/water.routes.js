const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const waterController = require('./water.controller');

// POST /api/water — log a water intake
router.post('/', authenticateToken, waterController.logWater);

// GET /api/water/logged-dates — get all dates with water logs
router.get('/logged-dates', authenticateToken, waterController.getLoggedDates);

// GET /api/water?date=YYYY-MM-DD — get logs for a specific day
router.get('/', authenticateToken, waterController.getWaterLogs);

// DELETE /api/water/reset?date=YYYY-MM-DD — reset all water logs for a day
router.delete('/reset', authenticateToken, waterController.resetWaterLogs);

// DELETE /api/water/:id — undo a specific log entry
router.delete('/:id', authenticateToken, waterController.deleteWaterLog);

// GET /api/water/reminder-settings — get current user's reminder preferences
router.get('/reminder-settings', authenticateToken, waterController.getReminderSettings);

// POST /api/water/reminder-settings — update reminder preferences
router.post('/reminder-settings', authenticateToken, waterController.updateReminderSettings);

module.exports = router;
