const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { awardXP } = require('../utils/xp');

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

module.exports = router;
