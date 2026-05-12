const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const upload = require('../uploadConfig');

// ── GET /daily/workouts — list past workouts for user ─────────────────────────
router.get('/workouts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dw.*,
        ws.name AS split_name,
        wsess.name AS session_name,
        (SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = dw.id) AS exercise_count,
        (SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = dw.id AND is_completed = true) AS completed_count,
        (SELECT COUNT(*) FROM daily_workout_sets dws 
         JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id 
         WHERE dwe.daily_workout_id = dw.id) AS total_sets,
        (SELECT photo_url FROM daily_workout_photos WHERE daily_workout_id = dw.id ORDER BY created_at ASC LIMIT 1) AS cover_photo_url
       FROM daily_workouts dw
       LEFT JOIN workout_splits ws ON dw.split_id = ws.id
       LEFT JOIN workout_sessions wsess ON dw.session_id = wsess.id
       WHERE dw.user_id = $1
       ORDER BY dw.started_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /daily/workouts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /daily/workouts — start a new workout ────────────────────────────────
router.post(
  '/workouts',
  authenticateToken,
  validate(schemas.startWorkout),
  async (req, res) => {
    const { title, split_id, session_id } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO daily_workouts (user_id, title, split_id, session_id, started_at, status)
         VALUES ($1, $2, $3, $4, NOW(), 'active') RETURNING *`,
        [req.user.id, title || null, split_id || null, session_id || null]
      );

      // Auto-import exercises from the selected session
      if (session_id) {
        const exercises = await pool.query(
          `SELECT * FROM workout_session_exercises WHERE session_id = $1 ORDER BY sort_order ASC`,
          [session_id]
        );
        for (const [i, ex] of exercises.rows.entries()) {
          await pool.query(
            `INSERT INTO daily_workout_exercises
               (daily_workout_id, exercise_id, target_sets, target_reps, target_weight, target_rest_time, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [result.rows[0].id, ex.exercise_id, ex.sets, ex.reps, ex.weight || '0', ex.rest_time || '60s', i]
          );
        }
      }

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /daily/workouts error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /daily/workouts/:id — get workout with all exercises + sets ────────────
router.get('/workouts/:id', authenticateToken, async (req, res) => {
  try {
    const workout = await pool.query(
      `SELECT dw.*, ws.name AS split_name, wsess.name AS session_name
       FROM daily_workouts dw
       LEFT JOIN workout_splits ws ON dw.split_id = ws.id
       LEFT JOIN workout_sessions wsess ON dw.session_id = wsess.id
       WHERE dw.id = $1 AND dw.user_id = $2`,
      [parseInt(req.params.id), req.user.id]
    );
    if (workout.rows.length === 0) return res.status(404).json({ error: 'Workout not found' });

    const exercises = await pool.query(
      `SELECT dwe.*, e.name, e.image_url, e.gif_url, e.instructions_en, e.target, e.equipment, e.category
       FROM daily_workout_exercises dwe
       JOIN exercises e ON dwe.exercise_id = e.id
       WHERE dwe.daily_workout_id = $1
       ORDER BY dwe.sort_order ASC`,
      [parseInt(req.params.id)]
    );

    let setsRows = [];
    const exerciseIds = exercises.rows.map(e => e.id);
    if (exerciseIds.length > 0) {
      const sets = await pool.query(
        `SELECT * FROM daily_workout_sets
         WHERE daily_exercise_id = ANY($1::int[])
         ORDER BY set_number ASC`,
        [exerciseIds]
      );
      setsRows = sets.rows;
    }

    const exercisesWithSets = exercises.rows.map(ex => ({
      ...ex,
      sets: setsRows.filter(s => s.daily_exercise_id === ex.id),
    }));

    const photos = await pool.query(
      'SELECT * FROM daily_workout_photos WHERE daily_workout_id = $1 ORDER BY created_at ASC',
      [parseInt(req.params.id)]
    );

    res.json({ ...workout.rows[0], exercises: exercisesWithSets, photos: photos.rows });
  } catch (err) {
    console.error('GET /daily/workouts/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /daily/workouts/:id/exercises — add an exercise mid-workout ──────────
router.post(
  '/workouts/:id/exercises',
  authenticateToken,
  validate(schemas.addExercise),
  async (req, res) => {
    const { exercise_id, target_sets, target_reps, target_weight } = req.body;
    try {
      const check = await pool.query(
        'SELECT id FROM daily_workouts WHERE id = $1 AND user_id = $2',
        [parseInt(req.params.id), req.user.id]
      );
      if (check.rows.length === 0) return res.status(403).json({ error: 'Unauthorized' });

      const sortResult = await pool.query(
        'SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = $1',
        [parseInt(req.params.id)]
      );
      const sort_order = parseInt(sortResult.rows[0].count);

      const result = await pool.query(
        `INSERT INTO daily_workout_exercises
           (daily_workout_id, exercise_id, target_sets, target_reps, target_weight, target_rest_time, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [parseInt(req.params.id), exercise_id, target_sets, target_reps, target_weight, req.body.target_rest_time || '60s', sort_order]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /daily/workouts/:id/exercises error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── POST /daily/exercises/:id/sets — log a completed set ─────────────────────
router.post(
  '/exercises/:id/sets',
  authenticateToken,
  validate(schemas.logSet),
  async (req, res) => {
    const { set_number, weight, reps, duration_seconds, rest_seconds, workout_duration, is_skipped } = req.body;
    try {
      // Log the set
      const result = await pool.query(
        `INSERT INTO daily_workout_sets
           (daily_exercise_id, set_number, weight, reps, duration_seconds, rest_seconds, is_skipped)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [parseInt(req.params.id), set_number, weight, reps || 0, duration_seconds, rest_seconds, is_skipped || false]
      );

      // Sync workout duration if provided
      const { total_rest_duration } = req.body;
      if (workout_duration !== undefined || total_rest_duration !== undefined) {
        await pool.query(
          `UPDATE daily_workouts 
           SET total_duration_seconds = COALESCE($1, total_duration_seconds),
               total_rest_seconds = COALESCE($2, total_rest_seconds)
           WHERE id = (SELECT daily_workout_id FROM daily_workout_exercises WHERE id = $3)`,
          [workout_duration, total_rest_duration, parseInt(req.params.id)]
        );
      }

      // Auto-complete exercise when all target sets are logged
      const exerciseInfo = await pool.query(
        'SELECT target_sets FROM daily_workout_exercises WHERE id = $1',
        [parseInt(req.params.id)]
      );
      const setCount = await pool.query(
        'SELECT COUNT(*) FROM daily_workout_sets WHERE daily_exercise_id = $1',
        [parseInt(req.params.id)]
      );

      if (
        exerciseInfo.rows.length > 0 &&
        parseInt(setCount.rows[0].count) >= exerciseInfo.rows[0].target_sets
      ) {
        await pool.query(
          'UPDATE daily_workout_exercises SET is_completed = true WHERE id = $1',
          [parseInt(req.params.id)]
        );
      }

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /daily/exercises/:id/sets error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── PATCH /daily/exercises/:id/skip — skip an exercise ───────────────────────
router.patch('/exercises/:id/skip', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE daily_workout_exercises SET is_skipped = true, is_completed = true WHERE id = $1 RETURNING id',
      [parseInt(req.params.id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /daily/exercises/:id/skip error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /daily/exercises/:id/complete — manually mark exercise done ─────────
router.patch('/exercises/:id/complete', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE daily_workout_exercises SET is_completed = true, is_skipped = false WHERE id = $1 RETURNING id',
      [parseInt(req.params.id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /daily/exercises/:id/complete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /daily/workouts/:id/complete — finish the workout ──────────────────
router.patch(
  '/workouts/:id/complete',
  authenticateToken,
  validate(schemas.completeWorkout),
  async (req, res) => {
    const { total_duration_seconds, total_volume, notes, completion_photo_url } = req.body;
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`[Daily] Finishing workout ${id} for user ${userId}`);
    console.log('[Daily] Body:', req.body);

    try {
      const { water_intake_liters, post_workout_weight, photos, total_rest_seconds } = req.body;
      
      // Check if all exercises are done or skipped
      const exercisesCheck = await pool.query(
        'SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = $1 AND is_completed = false',
        [parseInt(id)]
      );
      const remainingCount = parseInt(exercisesCheck.rows[0].count);
      const shouldComplete = remainingCount === 0;

      // Build dynamic update query
      let updateFields = [];
      let queryParams = [];
      let paramIdx = 1;

      const addToQuery = (field, val) => {
        if (val !== undefined) {
          updateFields.push(`${field} = $${paramIdx}`);
          queryParams.push(val);
          paramIdx++;
        }
      };

      addToQuery('status', 'completed');
      updateFields.push(`completed_at = $${paramIdx}`);
      queryParams.push(new Date());
      paramIdx++;

      addToQuery('total_duration_seconds', total_duration_seconds);
      addToQuery('total_volume', total_volume);
      addToQuery('notes', notes);
      addToQuery('completion_photo_url', completion_photo_url);
      addToQuery('water_intake_liters', water_intake_liters);
      addToQuery('post_workout_weight', post_workout_weight);
      addToQuery('total_rest_seconds', total_rest_seconds);

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      queryParams.push(parseInt(id), userId);
      const query = `UPDATE daily_workouts SET ${updateFields.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1} RETURNING *`;
      
      const result = await pool.query(query, queryParams);

      if (result.rows.length === 0) {
        console.warn(`[Daily] Workout ${id} not found or not owned by user ${userId}`);
        return res.status(404).json({ error: 'Workout not found or unauthorized' });
      }

      // Handle multi-photos if provided
      if (Array.isArray(photos)) {
        // Clear old ones first (if any)
        await pool.query('DELETE FROM daily_workout_photos WHERE daily_workout_id = $1', [parseInt(id)]);
        for (const photoUrl of photos) {
          await pool.query(
            'INSERT INTO daily_workout_photos (daily_workout_id, photo_url) VALUES ($1, $2)',
            [parseInt(id), photoUrl]
          );
        }
      }

      console.log(`[Daily] Workout ${id} saved. Status: ${result.rows[0].status}`);
      res.json({ ...result.rows[0], photos: photos || [] });
    } catch (err) {
      console.error('[Daily] PATCH /complete error:', err);
      res.status(500).json({ error: 'Database update failed', details: err.message });
    }
  }
);

// ── DELETE /daily/workouts/:id — remove a workout ────────────────────────────
router.delete('/workouts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM daily_workouts WHERE id = $1 AND user_id = $2 RETURNING id',
      [parseInt(id), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found or unauthorized' });
    }

    res.json({ success: true, message: 'Workout and associated photos deleted' });
  } catch (err) {
    console.error('DELETE /daily/workouts/:id error:', err);
    res.status(500).json({ error: 'Database deletion failed', details: err.message });
  }
});

// ── PATCH /daily/workouts/:id/metrics — update weight and water ──────────────
router.patch('/workouts/:id/metrics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { water_intake_liters, post_workout_weight, total_duration_seconds, total_rest_seconds } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE daily_workouts
       SET water_intake_liters = COALESCE($1, water_intake_liters),
           post_workout_weight = COALESCE($2, post_workout_weight),
           total_duration_seconds = COALESCE($3, total_duration_seconds),
           total_rest_seconds = COALESCE($4, total_rest_seconds)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [water_intake_liters, post_workout_weight, total_duration_seconds, total_rest_seconds, parseInt(id), userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Workout not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /daily/workouts/:id/metrics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /daily/workouts/:id/photos — upload and append photos ────────────────
router.post('/workouts/:id/photos', authenticateToken, upload.array('photos', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const workoutCheck = await pool.query(
      'SELECT id FROM daily_workouts WHERE id = $1 AND user_id = $2',
      [parseInt(id), userId]
    );
    if (workoutCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL.endsWith('/') 
      ? process.env.CLOUDFLARE_R2_PUBLIC_URL.slice(0, -1) 
      : process.env.CLOUDFLARE_R2_PUBLIC_URL;

    const urls = req.files.map(file => `${publicUrl}/${file.key}`);

    for (const url of urls) {
      await pool.query(
        'INSERT INTO daily_workout_photos (daily_workout_id, photo_url) VALUES ($1, $2)',
        [parseInt(id), url]
      );
    }
    res.json({ success: true, urls });
  } catch (err) {
    console.error('POST /daily/workouts/:id/photos error:', err);
    res.status(500).json({ error: err.message });
  }
});


// ── DELETE /daily/photos/:id — delete a specific photo ───────────────────────
router.delete('/photos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM daily_workout_photos WHERE id = $1', [parseInt(id)]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /daily/photos/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /daily/exercises/:id — remove exercise from current workout ───────
router.delete('/exercises/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const workoutCheck = await pool.query(
      `SELECT dw.user_id 
       FROM daily_workout_exercises dwe
       JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
       WHERE dwe.id = $1`,
      [parseInt(id)]
    );

    if (workoutCheck.rows.length === 0) return res.status(404).json({ error: 'Exercise not found' });
    if (workoutCheck.rows[0].user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    await pool.query('DELETE FROM daily_workout_sets WHERE daily_exercise_id = $1', [parseInt(id)]);
    await pool.query('DELETE FROM daily_workout_exercises WHERE id = $1', [parseInt(id)]);

    res.json({ success: true, message: 'Exercise removed from session' });
  } catch (err) {
    console.error('DELETE /daily/exercises/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /daily/sets/:id — remove a single set ─────────────────────────────
router.delete('/sets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const setCheck = await pool.query(
      `SELECT dw.user_id 
       FROM daily_workout_sets dws
       JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id
       JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
       WHERE dws.id = $1`,
      [parseInt(id)]
    );

    if (setCheck.rows.length === 0) return res.status(404).json({ error: 'Set not found' });
    if (setCheck.rows[0].user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    await pool.query('DELETE FROM daily_workout_sets WHERE id = $1', [parseInt(id)]);

    res.json({ success: true, message: 'Set deleted' });
  } catch (err) {
    console.error('DELETE /daily/sets/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
