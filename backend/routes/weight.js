const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

// POST /api/weight — log a new weight entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { weight, notes } = req.body;
    if (weight === undefined || weight === null || weight === '' || isNaN(parseFloat(weight))) {
      return res.status(400).json({ error: 'Valid weight is required' });
    }
    const result = await pool.query(
      'INSERT INTO weight_logs (user_id, weight, notes) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, parseFloat(weight), notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error logging weight:', err);
    res.status(500).json({ error: 'Failed to log weight' });
  }
});

// GET /api/weight — get all weight entries for user (includes post-workout weights)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit, range } = req.query;

    // Date range filter (separate for each table — column names differ)
    let logFilter = '';
    let workoutFilter = '';
    if (range === '7d') {
      logFilter = "AND logged_at >= NOW() - INTERVAL '7 days'";
      workoutFilter = "AND dw.completed_at >= NOW() - INTERVAL '7 days'";
    } else if (range === '30d') {
      logFilter = "AND logged_at >= NOW() - INTERVAL '30 days'";
      workoutFilter = "AND dw.completed_at >= NOW() - INTERVAL '30 days'";
    } else if (range === '90d') {
      logFilter = "AND logged_at >= NOW() - INTERVAL '90 days'";
      workoutFilter = "AND dw.completed_at >= NOW() - INTERVAL '90 days'";
    } else if (range === '1y') {
      logFilter = "AND logged_at >= NOW() - INTERVAL '365 days'";
      workoutFilter = "AND dw.completed_at >= NOW() - INTERVAL '365 days'";
    }

    const result = await pool.query(
      `SELECT * FROM (
        SELECT DISTINCT ON (logged_at::date, ROUND(weight::numeric, 1))
          id, weight::text, notes, logged_at
        FROM (
          SELECT id, weight::text AS weight, notes, logged_at FROM weight_logs WHERE user_id = $1 ${logFilter}
          UNION ALL
          SELECT -(dw.id) AS id, dw.post_workout_weight::text AS weight,
                 'Post-workout' AS notes,
                 dw.completed_at AS logged_at
          FROM daily_workouts dw
          WHERE dw.user_id = $1 AND dw.post_workout_weight IS NOT NULL AND dw.status = 'completed' ${workoutFilter}
        ) combined
        ORDER BY logged_at::date, ROUND(weight::numeric, 1), logged_at DESC
      ) deduped ORDER BY logged_at ASC` +
        (limit ? ' LIMIT ' + parseInt(limit) : ''),
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching weight logs:', err);
    res.status(500).json({ error: 'Failed to fetch weight logs' });
  }
});

// DELETE /api/weight/:id — delete a weight entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM weight_logs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Weight entry not found' });
    }
    res.json({ message: 'Weight entry deleted' });
  } catch (err) {
    console.error('Error deleting weight entry:', err);
    res.status(500).json({ error: 'Failed to delete weight entry' });
  }
});

module.exports = router;
