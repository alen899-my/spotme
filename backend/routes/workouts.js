const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

// ─── TEMPLATE SPLITS (pre-seeded, read-only) ─────────────────────────────────

// GET /workouts/templates — list all expert splits with randomized images
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM workout_sessions WHERE split_id = s.id) as session_count,
        (
          SELECT json_agg(image_url) FROM (
            SELECT DISTINCT e.image_url 
            FROM workout_sessions ws
            JOIN workout_session_exercises wse ON ws.id = wse.session_id
            JOIN exercises e ON wse.exercise_id = e.id
            WHERE ws.split_id = s.id AND e.image_url IS NOT NULL
            LIMIT 5
          ) sub
        ) as exercise_images
      FROM workout_splits s
      WHERE s.is_template = true
      ORDER BY s.id ASC
    `);

    // Manually shuffle images on the backend for variety if needed, 
    // or just rely on the fact that they are distinct.
    res.json(result.rows);
  } catch (err) {
    console.error('Templates Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /workouts/templates/:id — single template detail with sessions + exercises
router.get('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const split = await pool.query(
      'SELECT * FROM workout_splits WHERE id = $1 AND is_template = true',
      [req.params.id]
    );
    if (split.rows.length === 0) return res.status(404).json({ error: 'Template not found' });

    const sessions = await pool.query(
      'SELECT * FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order ASC',
      [req.params.id]
    );

    const sessionIds = sessions.rows.map(s => s.id);
    let exercises = [];
    if (sessionIds.length > 0) {
      const exRes = await pool.query(
        `SELECT wse.*, e.name, e.category, e.image_url, e.target, e.equipment
         FROM workout_session_exercises wse
         JOIN exercises e ON wse.exercise_id = e.id
         WHERE wse.session_id = ANY($1::int[])
         ORDER BY wse.sort_order ASC`,
        [sessionIds]
      );
      exercises = exRes.rows;
    }

    const sessionsWithExercises = sessions.rows.map(sess => ({
      ...sess,
      exercises: exercises.filter(e => e.session_id === sess.id),
    }));

    res.json({ ...split.rows[0], sessions: sessionsWithExercises });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /workouts/templates/:id/clone — copy a template to the current user's splits
router.post('/templates/:id/clone', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch source template
    const template = await client.query(
      'SELECT * FROM workout_splits WHERE id = $1 AND is_template = true',
      [req.params.id]
    );
    if (template.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Template not found' });
    }
    const src = template.rows[0];

    // Create new user split (not a template)
    const newSplit = await client.query(
      `INSERT INTO workout_splits (user_id, name, description, is_template)
       VALUES ($1, $2, $3, false) RETURNING *`,
      [req.user.id, src.name, src.description]
    );
    const newSplitId = newSplit.rows[0].id;

    // Clone sessions
    const sessions = await client.query(
      'SELECT * FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order ASC',
      [src.id]
    );

    for (const sess of sessions.rows) {
      const newSess = await client.query(
        'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
        [newSplitId, sess.name, sess.sort_order]
      );
      const newSessId = newSess.rows[0].id;

      // Clone exercises in this session
      const exercises = await client.query(
        'SELECT * FROM workout_session_exercises WHERE session_id = $1 ORDER BY sort_order ASC',
        [sess.id]
      );
      for (const ex of exercises.rows) {
        await client.query(
          'INSERT INTO workout_session_exercises (session_id, exercise_id, sets, reps, rest_time, weight, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [newSessId, ex.exercise_id, ex.sets, ex.reps, ex.rest_time, ex.weight, ex.sort_order]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, split_id: newSplitId, message: `"${src.name}" added to your splits!` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Clone template error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── MAIN SPLITS ─────────────────────────────────────────────────────────────

// Get all splits for current user
router.get('/splits', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM workout_sessions WHERE split_id = s.id) as session_count,
        (
          SELECT json_agg(image_url) FROM (
            SELECT DISTINCT e.image_url 
            FROM workout_sessions ws
            JOIN workout_session_exercises wse ON ws.id = wse.session_id
            JOIN exercises e ON wse.exercise_id = e.id
            WHERE ws.split_id = s.id AND e.image_url IS NOT NULL
            LIMIT 5
          ) sub
        ) as exercise_images
       FROM workout_splits s 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch user splits error:', error);
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

// Delete split (users cannot delete templates)
router.delete('/splits/:id', authenticateToken, async (req, res) => {
  try {
    // Guard: prevent deleting templates
    const check = await pool.query('SELECT is_template FROM workout_splits WHERE id = $1', [req.params.id]);
    if (check.rows.length > 0 && check.rows[0].is_template) {
      return res.status(403).json({ error: 'Template splits cannot be deleted.' });
    }
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
        (SELECT COUNT(*) FROM workout_session_exercises WHERE session_id = ws.id) as exercise_count,
        (
          SELECT e.image_url 
          FROM workout_session_exercises wse
          JOIN exercises e ON wse.exercise_id = e.id
          WHERE wse.session_id = ws.id AND e.image_url IS NOT NULL
          LIMIT 1
        ) as sample_image
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

// ─── GLOBAL EXERCISES BROWSER ────────────────────────────────────────────────

// Get all unique categories
router.get('/exercises/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM exercises ORDER BY category ASC');
    res.json(result.rows.map(r => r.category));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get exercises by category
router.get('/exercises/by-category/:category', authenticateToken, async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE category = $1 ORDER BY name ASC LIMIT $2 OFFSET $3',
      [req.params.category, parseInt(limit), parseInt(offset)]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/exercises/search', authenticateToken, async (req, res) => {
  const { q, category, limit = 20, offset = 0 } = req.query;
  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    // Only filter by name/target if q is provided
    if (q && q.trim()) {
      conditions.push(`(name ILIKE $${idx} OR target ILIKE $${idx})`);
      params.push(`%${q.trim()}%`);
      idx++;
    }

    if (category && category.trim()) {
      conditions.push(`category ILIKE $${idx}`);
      params.push(category.trim());
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT * FROM exercises 
      ${where}
      ORDER BY name ASC 
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
