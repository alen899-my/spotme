const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

// ─── MAIN SPLITS ─────────────────────────────────────────────────────────────

// Get all splits for current user
router.get('/splits', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
       (SELECT COUNT(*) FROM workout_sessions WHERE split_id = s.id) as session_count
       FROM workout_splits s 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new split (Group)
router.post('/splits', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO workout_splits (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete split
router.delete('/splits/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM workout_splits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Split deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── SESSIONS (DAYS WITHIN A SPLIT) ──────────────────────────────────────────

// Get sessions for a split
router.get('/splits/:id/sessions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ws.*, 
       (SELECT COUNT(*) FROM workout_session_exercises WHERE session_id = ws.id) as exercise_count
       FROM workout_sessions ws 
       WHERE split_id = (SELECT id FROM workout_splits WHERE id = $1 AND user_id = $2)
       ORDER BY sort_order ASC`,
      [req.params.id, req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new session
router.post('/splits/:id/sessions', authenticateToken, async (req, res) => {
  const { name, sort_order } = req.body;
  try {
    // Verify ownership
    const split = await pool.query('SELECT id FROM workout_splits WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (split.rows.length === 0) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, name, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete session
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM workout_sessions 
       WHERE id = $1 AND split_id IN (SELECT id FROM workout_splits WHERE user_id = $2)`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── EXERCISES (WITHIN A SESSION) ─────────────────────────────────────────────

// Get exercises for a session
router.get('/sessions/:id/exercises', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wse.*, e.name, e.category, e.image_url, e.target, e.equipment 
       FROM workout_session_exercises wse 
       JOIN exercises e ON wse.exercise_id = e.id 
       WHERE wse.session_id = (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON ws.split_id = s.id WHERE ws.id = $1 AND s.user_id = $2)
       ORDER BY wse.sort_order ASC`,
      [req.params.id, req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add exercise to session
router.post('/sessions/:id/exercises', authenticateToken, async (req, res) => {
  const { exercise_id, sets, reps, rest_time, sort_order } = req.body;
  try {
    // Verify ownership
    const session = await pool.query(
      `SELECT ws.id FROM workout_sessions ws 
       JOIN workout_splits s ON ws.split_id = s.id 
       WHERE ws.id = $1 AND s.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (session.rows.length === 0) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'INSERT INTO workout_session_exercises (session_id, exercise_id, sets, reps, rest_time, weight, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.params.id, exercise_id, sets || 3, reps || '8-12', rest_time || '60s', '0', sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove exercise from session
router.delete('/exercises/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM workout_session_exercises 
       WHERE id = $1 AND session_id IN (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON ws.split_id = s.id WHERE s.user_id = $2)`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Exercise removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update exercise stats in session
router.put('/exercises/:id', authenticateToken, async (req, res) => {
  const { sets, reps, rest_time, weight } = req.body;
  try {
    const result = await pool.query(
      `UPDATE workout_session_exercises 
       SET sets = $1, reps = $2, rest_time = $3, weight = $4
       WHERE id = $5 AND session_id IN (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON ws.split_id = s.id WHERE s.user_id = $6)
       RETURNING *`,
      [sets, reps, rest_time, weight, req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found or unauthorized' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
