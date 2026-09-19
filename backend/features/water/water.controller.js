const waterService = require('./water.service');

/**
 * Controller to log a water intake.
 */
async function logWater(req, res) {
  try {
    const { amount_ml } = req.body;
    if (!amount_ml || amount_ml <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const data = await waterService.logWaterIntake(req.user.id, amount_ml);
    return res.status(201).json(data);
  } catch (err) {
    console.error('Water log error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get all dates with water logs.
 */
async function getLoggedDates(req, res) {
  try {
    const dates = await waterService.getLoggedDates(req.user.id);
    return res.json(dates);
  } catch (err) {
    console.error('GET /water/logged-dates error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get logs for a specific day.
 */
async function getWaterLogs(req, res) {
  try {
    const { date } = req.query;
    const data = await waterService.getWaterLogsByDate(req.user.id, date);

    // Fire-and-forget: check if water reminder push is due
    waterService.checkSendWaterReminder(req.user.id).catch(() => {});

    return res.json(data);
  } catch (err) {
    console.error('Water fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to reset all water logs for a day.
 */
async function resetWaterLogs(req, res) {
  try {
    const { date } = req.query;
    await waterService.resetWaterLogs(req.user.id, date);
    return res.json({ success: true });
  } catch (err) {
    console.error('Water reset error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to delete a specific water log entry.
 */
async function deleteWaterLog(req, res) {
  try {
    const found = await waterService.deleteWaterLog(req.user.id, req.params.id);
    if (!found) {
      return res.status(404).json({ error: 'Log not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /water/:id error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get reminder preferences.
 */
async function getReminderSettings(req, res) {
  try {
    const settings = await waterService.getReminderSettings(req.user.id);
    if (!settings) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(settings);
  } catch (err) {
    console.error('GET /water/reminder-settings error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to update reminder preferences.
 */
async function updateReminderSettings(req, res) {
  try {
    const { water_reminder_enabled, water_reminder_interval } = req.body;
    await waterService.updateReminderSettings(req.user.id, {
      water_reminder_enabled,
      water_reminder_interval,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('POST /water/reminder-settings error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  logWater,
  getLoggedDates,
  getWaterLogs,
  resetWaterLogs,
  deleteWaterLog,
  getReminderSettings,
  updateReminderSettings,
};
