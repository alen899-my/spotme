const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { awardXP } = require('../utils/xp');
const { sendPush } = require('../utils/pushNotifications');

async function checkSendWaterReminder(userId) {
  try {
    const user = await pool.query(
      `SELECT water_reminder_enabled, water_reminder_interval, last_water_reminded_at
       FROM users WHERE id = $1`,
      [userId]
    );
    if (!user.rows.length || !user.rows[0].water_reminder_enabled) return;

    const { water_reminder_interval, last_water_reminded_at } = user.rows[0];
    const intervalMs = (water_reminder_interval || 120) * 60 * 1000;

    // Don't remind if we already sent one within the interval
    if (last_water_reminded_at) {
      const elapsed = Date.now() - new Date(last_water_reminded_at).getTime();
      if (elapsed < intervalMs) return;
    }

    // Find the most recent water log
    const lastLog = await pool.query(
      `SELECT logged_at FROM water_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 1`,
      [userId]
    );

    // If user never logged or last log is older than interval, send reminder
    if (!lastLog.rows.length) return; // No logs ever, skip
    const sinceLastLog = Date.now() - new Date(lastLog.rows[0].logged_at).getTime();
    if (sinceLastLog < intervalMs) return; // Drank recently, no reminder needed

    await sendPush(userId, '💧 Time to Hydrate', 'Stay hydrated! Your body needs water to perform at its best.', { type: 'water_reminder' });

    await pool.query(
      'UPDATE users SET last_water_reminded_at = NOW() WHERE id = $1',
      [userId]
    );
  } catch (err) {
    console.error('checkSendWaterReminder error:', err.message);
  }
}

// POST /api/water — log a water intake
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { amount_ml } = req.body;
    if (!amount_ml || amount_ml <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO water_logs (user_id, amount_ml, logged_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [userId, amount_ml]
    );

    // ── Check daily water goal ─────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00.000Z`;
    const todayEnd = `${today}T23:59:59.999Z`;

    const dayTotal = await pool.query(
      `SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM water_logs
       WHERE user_id = $1 AND logged_at BETWEEN $2 AND $3`,
      [userId, todayStart, todayEnd]
    );
    const totalMl = parseInt(dayTotal.rows[0].total_ml);

    const userRes = await pool.query(
      `SELECT weight, activity_level, water_goal_date FROM users WHERE id = $1`,
      [userId]
    );
    const u = userRes.rows[0];

    // Compute target (same formula as frontend HydrationCard)
    const weight = parseFloat(u?.weight || "70") || 70;
    let target = Math.round(weight * 35);
    const lvl = (u?.activity_level || "").toLowerCase();
    if (lvl.includes("very") || lvl.includes("high") || lvl.includes("extreme")) target += 750;
    else if (lvl.includes("moderate")) target += 400;
    else if (lvl.includes("light")) target += 200;

    let xpAwarded = 0;
    if (totalMl >= target && u?.water_goal_date !== today) {
      const awardRes = await awardXP(pool, userId, 10, 'Reached daily water goal');
      xpAwarded = 10;
      await pool.query('UPDATE users SET water_goal_date = $1 WHERE id = $2', [today, userId]);
    }

    // Reset reminder timer — user just drank
    await pool.query('UPDATE users SET last_water_reminded_at = NULL WHERE id = $1', [userId]);

    res.status(201).json({
      ...result.rows[0],
      xp_awarded: xpAwarded,
      daily_total_ml: totalMl,
      daily_goal_ml: target,
    });
  } catch (err) {
    console.error('Water log error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/water?date=YYYY-MM-DD — get logs for a specific day
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(targetDate); end.setHours(23, 59, 59, 999);

    const result = await pool.query(
      `SELECT * FROM water_logs WHERE user_id = $1 AND logged_at BETWEEN $2 AND $3 ORDER BY logged_at DESC`,
      [req.user.id, start.toISOString(), end.toISOString()]
    );
    const totalMl = result.rows.reduce((sum, r) => sum + r.amount_ml, 0);

    // Fire-and-forget: check if water reminder push is due
    checkSendWaterReminder(req.user.id).catch(() => {});

    res.json({ logs: result.rows, total_ml: totalMl });
  } catch (err) {
    console.error('Water fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/water/reset?date=YYYY-MM-DD — reset all water logs for a day
router.delete('/reset', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end   = new Date(targetDate); end.setHours(23, 59, 59, 999);

    await pool.query(
      `DELETE FROM water_logs WHERE user_id = $1 AND logged_at BETWEEN $2 AND $3`,
      [req.user.id, start.toISOString(), end.toISOString()]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Water reset error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/water/:id — undo a specific log entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM water_logs WHERE id = $1 AND user_id = $2 RETURNING *',
      [parseInt(req.params.id), req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Log not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/water/reminder-settings — get current user's reminder preferences
router.get('/reminder-settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT water_reminder_enabled, water_reminder_interval FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /water/reminder-settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/water/reminder-settings — update reminder preferences
router.post('/reminder-settings', authenticateToken, async (req, res) => {
  try {
    const { water_reminder_enabled, water_reminder_interval } = req.body;
    await pool.query(
      `UPDATE users SET water_reminder_enabled = $1, water_reminder_interval = $2 WHERE id = $3`,
      [water_reminder_enabled, water_reminder_interval || 120, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('POST /water/reminder-settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
