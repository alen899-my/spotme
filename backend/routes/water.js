const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

// POST /api/water — log a water intake
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { amount_ml } = req.body;
    if (!amount_ml || amount_ml <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const result = await pool.query(
      `INSERT INTO water_logs (user_id, amount_ml, logged_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [req.user.id, amount_ml]
    );
    res.status(201).json(result.rows[0]);
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
