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
         WHERE dwe.daily_workout_id = dw.id AND dws.is_skipped = false) AS total_sets,
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
         VALUES ($1, $2, $3, $4, NOW() AT TIME ZONE 'UTC', 'active') RETURNING *`,
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
      `SELECT dw.*, 
        ws.name AS split_name, 
        wsess.name AS session_name,
        (SELECT COUNT(*) FROM daily_workout_sets dws 
         JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id 
         WHERE dwe.daily_workout_id = dw.id AND dws.is_skipped = false) AS total_sets,
        (SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = dw.id) AS exercise_count,
        (SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = dw.id AND is_completed = true) AS completed_count
       FROM daily_workouts dw
       LEFT JOIN workout_splits ws ON dw.split_id = ws.id
       LEFT JOIN workout_sessions wsess ON dw.session_id = wsess.id
       WHERE dw.id = $1 AND dw.user_id = $2`,
      [parseInt(req.params.id), req.user.id]
    );
    if (workout.rows.length === 0) return res.status(404).json({ error: 'Workout not found' });

    const exercises = await pool.query(
      `SELECT dwe.*, e.name, e.image_url, e.gif_url, e.instructions_en, e.target, e.equipment, e.category,
         (SELECT ROUND(AVG(dwe2.rating), 1)::float
          FROM daily_workout_exercises dwe2
          JOIN daily_workouts dw2 ON dwe2.daily_workout_id = dw2.id
          WHERE dwe2.exercise_id = dwe.exercise_id AND dw2.user_id = $2 AND dwe2.rating IS NOT NULL) AS avg_rating
       FROM daily_workout_exercises dwe
       JOIN exercises e ON dwe.exercise_id = e.id
       WHERE dwe.daily_workout_id = $1
       ORDER BY dwe.sort_order ASC`,
      [parseInt(req.params.id), req.user.id]
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
      
      console.log(`[Daily] Processing metrics for workout ${id}:`, {
        water: water_intake_liters,
        weight: post_workout_weight,
        photosCount: Array.isArray(photos) ? photos.length : 0
      });

      // Check if all exercises are done or skipped
      const exercisesCheck = await pool.query(
        'SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = $1 AND is_completed = false',
        [parseInt(id)]
      );
      const remainingCount = parseInt(exercisesCheck.rows[0].count);
      console.log(`[Daily] Remaining exercises for workout ${id}: ${remainingCount}`);

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
      
      console.log(`[Daily] Executing update query for workout ${id}`);
      const result = await pool.query(query, queryParams);

      if (result.rows.length === 0) {
        console.warn(`[Daily] Workout ${id} not found or not owned by user ${userId}`);
        return res.status(404).json({ error: 'Workout not found or unauthorized' });
      }

      // Handle multi-photos if provided
      if (Array.isArray(photos)) {
        console.log(`[Daily] Updating ${photos.length} photos for workout ${id}`);
        // Clear old ones first (if any)
        await pool.query('DELETE FROM daily_workout_photos WHERE daily_workout_id = $1', [parseInt(id)]);
        for (const photoUrl of photos) {
          await pool.query(
            'INSERT INTO daily_workout_photos (daily_workout_id, photo_url) VALUES ($1, $2)',
            [parseInt(id), photoUrl]
          );
        }
      }

      console.log(`[Daily] Workout ${id} successfully finalized. Status: ${result.rows[0].status}`);

      // ─── STREAK CALCULATION ───
      try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // 1. Check for any skips in this workout
        const skippedCheck = await pool.query(
          'SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = $1 AND is_skipped = true',
          [parseInt(id)]
        );
        const hasSkips = parseInt(skippedCheck.rows[0].count) > 0;

        // 2. Get user's current streak
        const userRes = await pool.query('SELECT current_streak, last_workout_date FROM users WHERE id = $1', [userId]);
        const { current_streak, last_workout_date } = userRes.rows[0];
        let newStreak = current_streak || 0;

        if (hasSkips) {
          // Rule: Skip any exercise = Streak Gone
          newStreak = 0;
          console.log(`[Streak] Reset to 0 due to skips in workout ${id}`);
        } else {
          if (!last_workout_date) {
            newStreak = 1;
          } else {
            const lastDateStr = new Date(last_workout_date).toISOString().split('T')[0];
            if (lastDateStr === today) {
              // Already counted today, no change
            } else if (lastDateStr === yesterday) {
              newStreak += 1;
            } else {
              // Missed at least one day = Streak Gone (Restart at 1)
              newStreak = 1;
            }
          }
        }

        await pool.query(
          'UPDATE users SET current_streak = $1, last_workout_date = $2 WHERE id = $3',
          [newStreak, today, userId]
        );
        
        // ─── XP & LEVEL CALCULATION ───
        const workoutStats = await pool.query(`
          SELECT 
            COUNT(dws.id) as total_sets,
            SUM(dws.reps) as total_reps,
            dw.total_duration_seconds,
            dw.total_volume
          FROM daily_workouts dw
          LEFT JOIN daily_workout_exercises dwe ON dw.id = dwe.daily_workout_id
          LEFT JOIN daily_workout_sets dws ON dwe.id = dws.daily_exercise_id
          WHERE dw.id = $1 AND dws.is_skipped = false
          GROUP BY dw.id
        `, [parseInt(id)]);

        if (workoutStats.rows.length > 0) {
          const stats = workoutStats.rows[0];
          const baseSetsXP = (parseInt(stats.total_sets) || 0) * 10;
          const baseRepsXP = (parseInt(stats.total_reps) || 0) * 1;
          const durationXP = Math.floor((parseInt(stats.total_duration_seconds) || 0) / 10);
          const volumeXP = Math.floor((parseFloat(stats.total_volume) || 0) / 100);
          const perfectBonus = hasSkips ? 0 : 150;
          
          let earnedXP = baseSetsXP + baseRepsXP + durationXP + volumeXP + perfectBonus;
          
          // Streak Multiplier: +5% per day, max 50%
          const streakMultiplier = 1 + Math.min((newStreak * 0.05), 0.5);
          earnedXP = Math.round(earnedXP * streakMultiplier);

          // Update User XP and Level
          const userXpRes = await pool.query('SELECT total_xp, level FROM users WHERE id = $1', [userId]);
          let { total_xp, level } = userXpRes.rows[0];
          
          total_xp = (total_xp || 0) + earnedXP;
          
          // Leveling logic: Level * 1000 XP per level
          let xpForNext = level * 1000;
          let leveledUp = false;
          while (total_xp >= xpForNext) {
            level += 1;
            xpForNext = level * 1000;
            leveledUp = true;
          }

          await pool.query('UPDATE users SET total_xp = $1, level = $2 WHERE id = $3', [total_xp, level, userId]);
          
          result.rows[0].earned_xp = earnedXP;
          result.rows[0].new_level = level;
          result.rows[0].leveled_up = leveledUp;
          result.rows[0].total_xp = total_xp;
        }

        result.rows[0].new_streak = newStreak;
      } catch (streakErr) {
        console.error('[XP/Streak] Failed to update metrics:', streakErr);
      }

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
router.post('/workouts/:id/photos', authenticateToken, upload.array('photos', 10), async (req, res) => {
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
      console.warn(`[Daily] No photos found in request for workout ${id}`);
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    console.log(`[Daily] Uploaded ${req.files.length} photos to R2 for workout ${id}`);

    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL.endsWith('/') 
      ? process.env.CLOUDFLARE_R2_PUBLIC_URL.slice(0, -1) 
      : process.env.CLOUDFLARE_R2_PUBLIC_URL;

    const urls = req.files.map(file => `${publicUrl}/${file.key}`);

    for (const url of urls) {
      console.log(`[Daily] Saving photo URL to DB: ${url}`);
      await pool.query(
        'INSERT INTO daily_workout_photos (daily_workout_id, photo_url) VALUES ($1, $2)',
        [parseInt(id), url]
      );
    }
    res.json({ success: true, urls });
  } catch (err) {
    console.error('[Daily] POST /daily/workouts/:id/photos error:', err);
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

// ── PATCH /daily/exercises/:id/rating — rate an exercise during a workout ─────
router.patch('/exercises/:id/rating', authenticateToken, async (req, res) => {
  const { rating } = req.body;
  const { id } = req.params;
  const userId = req.user.id;

  if (rating === undefined || rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 10' });
  }

  try {
    // Verify that the exercise belongs to a workout owned by the user
    const check = await pool.query(
      `SELECT dwe.id 
       FROM daily_workout_exercises dwe
       JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
       WHERE dwe.id = $1 AND dw.user_id = $2`,
      [parseInt(id), userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Workout exercise not found or unauthorized' });
    }

    const result = await pool.query(
      `UPDATE daily_workout_exercises
       SET rating = $1
       WHERE id = $2
       RETURNING *`,
      [parseInt(rating), parseInt(id)]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /daily/exercises/:id/rating error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /daily/workouts/:id/rating — rate an overall workout ────────────────
router.patch('/workouts/:id/rating', authenticateToken, async (req, res) => {
  const { rating } = req.body;
  const { id } = req.params;
  const userId = req.user.id;

  if (rating === undefined || rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 10' });
  }

  try {
    const result = await pool.query(
      `UPDATE daily_workouts
       SET rating = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [parseInt(rating), parseInt(id), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /daily/workouts/:id/rating error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /daily/recommendations — get workout session recommendations ──────────
router.get('/recommendations', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Fetch all workout sessions available to the user (their splits + templates)
    const sessionsRes = await pool.query(`
      SELECT ws.id AS session_id, ws.name AS session_name, s.id AS split_id, s.name AS split_name, s.is_template
      FROM workout_sessions ws
      JOIN workout_splits s ON ws.split_id = s.id
      WHERE s.user_id = $1 OR s.is_template = true
    `, [userId]);

    if (sessionsRes.rows.length === 0) {
      return res.json([]); // No sessions available to recommend
    }

    // 2. Fetch all user ratings for exercises
    const exerciseRatingsRes = await pool.query(`
      SELECT dwe.exercise_id, AVG(dwe.rating) as avg_rating, COUNT(dwe.rating) as rating_count
      FROM daily_workout_exercises dwe
      JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
      WHERE dw.user_id = $1 AND dwe.rating IS NOT NULL
      GROUP BY dwe.exercise_id
    `, [userId]);

    // 3. Fetch all user ratings for sessions
    const sessionRatingsRes = await pool.query(`
      SELECT dw.session_id, AVG(dw.rating) as avg_rating, COUNT(dw.rating) as rating_count
      FROM daily_workouts dw
      WHERE dw.user_id = $1 AND dw.session_id IS NOT NULL AND dw.rating IS NOT NULL
      GROUP BY dw.session_id
    `, [userId]);

    // 4. Fetch all exercises inside all sessions
    const sessionExercisesRes = await pool.query(`
      SELECT wse.session_id, wse.exercise_id, e.name, e.image_url, e.target, e.category, e.equipment
      FROM workout_session_exercises wse
      JOIN exercises e ON wse.exercise_id = e.id
    `);

    // Map ratings for quick lookup
    const exerciseRatings = {};
    exerciseRatingsRes.rows.forEach(row => {
      exerciseRatings[row.exercise_id] = parseFloat(row.avg_rating);
    });

    const sessionRatings = {};
    sessionRatingsRes.rows.forEach(row => {
      sessionRatings[row.session_id] = parseFloat(row.avg_rating);
    });

    // Group exercises by session_id
    const sessionExercises = {};
    sessionExercisesRes.rows.forEach(row => {
      if (!sessionExercises[row.session_id]) {
        sessionExercises[row.session_id] = [];
      }
      sessionExercises[row.session_id].push(row);
    });

    // Score and rank sessions
    const scoredSessions = sessionsRes.rows.map(session => {
      const exercises = sessionExercises[session.session_id] || [];
      
      // Calculate average exercise rating
      let exerciseScoreSum = 0;
      let ratedExercisesCount = 0;
      
      exercises.forEach(ex => {
        if (exerciseRatings[ex.exercise_id] !== undefined) {
          exerciseScoreSum += exerciseRatings[ex.exercise_id];
          ratedExercisesCount++;
        } else {
          exerciseScoreSum += 5.0; // Default score for unrated exercises
        }
      });
      
      const avgExerciseScore = exercises.length > 0 ? (exerciseScoreSum / exercises.length) : 5.0;
      
      // Get session rating
      const sessionScore = sessionRatings[session.session_id] !== undefined 
        ? sessionRatings[session.session_id] 
        : 5.0; // Default score for unrated sessions
      
      // Combined rating (60% exercise-based, 40% session-based)
      const score = (avgExerciseScore * 0.6) + (sessionScore * 0.4);
      
      // Determine a friendly recommendation reasoning label
      let reason = 'Featured workout for you';
      let scoreTag = 'Recommended';
      
      if (sessionRatings[session.session_id] >= 8.0) {
        reason = 'Based on your high past ratings';
        scoreTag = 'Highly Rated';
      } else if (ratedExercisesCount > 0 && avgExerciseScore >= 7.5) {
        reason = 'Includes exercises you love';
        scoreTag = 'Top Exercises';
      } else if (sessionRatings[session.session_id] === undefined && ratedExercisesCount === 0) {
        reason = 'Fresh routine to try out';
        scoreTag = 'New';
      }

      // Compile unique targets/muscles
      const targets = [...new Set(exercises.map(e => e.target).filter(Boolean))];

      return {
        session_id: session.session_id,
        session_name: session.session_name,
        split_id: session.split_id,
        split_name: session.split_name,
        is_template: session.is_template,
        score,
        reason,
        scoreTag,
        exercise_count: exercises.length,
        targets: targets.slice(0, 3), // Return up to 3 targets
        sample_image: exercises[0]?.image_url || null,
        exercises: exercises.slice(0, 5) // Return first 5 exercise previews
      };
    });

    // Sort by score desc, but put user's own splits slightly higher than template splits if scores are equal
    scoredSessions.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (a.is_template ? 1 : 0) - (b.is_template ? 1 : 0);
    });

    // Return the top 3 recommendations
    res.json(scoredSessions.slice(0, 3));
  } catch (err) {
    console.error('GET /daily/recommendations error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
