const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const upload = require('../uploadConfig');
const { awardXP } = require('../utils/xp');
const {
  parseWeightKg,
  calculateEstimatedOneRepMax,
  estimateWorkoutCalories,
  formatRecordValue,
} = require('../utils/workoutAnalytics');

async function syncWorkoutCompletionAnalytics(client, workoutId, userId) {
  const userRes = await client.query(
    'SELECT weight FROM users WHERE id = $1',
    [userId]
  );

  const workoutStatsRes = await client.query(
    `SELECT dw.total_duration_seconds, dw.total_rest_seconds, dw.total_volume, dw.post_workout_weight,
            COUNT(dws.id) FILTER (WHERE COALESCE(dws.is_skipped, false) = false) AS total_sets,
            COALESCE(SUM(dws.reps) FILTER (WHERE COALESCE(dws.is_skipped, false) = false), 0) AS total_reps
     FROM daily_workouts dw
     LEFT JOIN daily_workout_exercises dwe ON dw.id = dwe.daily_workout_id
     LEFT JOIN daily_workout_sets dws ON dwe.id = dws.daily_exercise_id
     WHERE dw.id = $1
     GROUP BY dw.id`,
    [workoutId]
  );

  const workoutStats = workoutStatsRes.rows[0] || {};
  const weightKg =
    parseWeightKg(workoutStats.post_workout_weight) ||
    parseWeightKg(userRes.rows[0]?.weight) ||
    70;

  const calorieSummary = estimateWorkoutCalories({
    weightKg,
    totalDurationSeconds: workoutStats.total_duration_seconds,
    totalRestSeconds: workoutStats.total_rest_seconds,
    totalVolume: workoutStats.total_volume,
    totalSets: workoutStats.total_sets,
    totalReps: workoutStats.total_reps,
  });

  await client.query(
    `UPDATE daily_workouts
     SET calories_burned = $1,
         workout_met = $2,
         calories_burned_method = $3
     WHERE id = $4`,
    [
      calorieSummary.caloriesBurned,
      calorieSummary.workoutMet,
      calorieSummary.method,
      workoutId,
    ]
  );

  const setRowsRes = await client.query(
    `SELECT dwe.id AS daily_exercise_id,
            dwe.exercise_id,
            e.name AS exercise_name,
            COALESCE(dws.weight, 0) AS weight,
            COALESCE(dws.reps, 0) AS reps,
            COALESCE(dws.is_skipped, false) AS is_skipped
     FROM daily_workout_exercises dwe
     JOIN exercises e ON e.id = dwe.exercise_id
     LEFT JOIN daily_workout_sets dws ON dws.daily_exercise_id = dwe.id
     WHERE dwe.daily_workout_id = $1
     ORDER BY dwe.id ASC, dws.set_number ASC`,
    [workoutId]
  );

  const grouped = new Map();
  for (const row of setRowsRes.rows) {
    if (!grouped.has(row.daily_exercise_id)) {
      grouped.set(row.daily_exercise_id, {
        dailyExerciseId: row.daily_exercise_id,
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        sets: [],
      });
    }
    grouped.get(row.daily_exercise_id).sets.push(row);
  }

  const exerciseIds = Array.from(new Set(setRowsRes.rows.map((row) => row.exercise_id)));
  if (exerciseIds.length === 0) {
    return { calorieSummary, exercisePrs: [] };
  }

  const userPrRes = await client.query(
    `SELECT * FROM user_exercise_prs
     WHERE user_id = $1
       AND exercise_id = ANY($2::varchar[])`,
    [userId, exerciseIds]
  );

  const globalPrRes = await client.query(
    `SELECT * FROM global_exercise_prs
     WHERE exercise_id = ANY($1::varchar[])`,
    [exerciseIds]
  );

  const userPrMap = new Map(
    userPrRes.rows.map((row) => [`${row.exercise_id}:${row.metric_type}`, row])
  );
  const globalPrMap = new Map(
    globalPrRes.rows.map((row) => [`${row.exercise_id}:${row.metric_type}`, row])
  );

  const exercisePrs = [];

  for (const exercise of grouped.values()) {
    const validSets = exercise.sets.filter((setRow) => !setRow.is_skipped && ((Number(setRow.weight) || 0) > 0 || (Number(setRow.reps) || 0) > 0));

    if (validSets.length === 0) {
      await client.query(
        `UPDATE daily_workout_exercises
         SET best_set_weight = 0,
             best_set_reps = 0,
             estimated_1rm = 0,
             total_set_volume = 0,
             record_metric_type = 'estimated_1rm',
             is_personal_record = false,
             is_world_record = false,
             personal_record_value = 0,
             world_record_value = 0
         WHERE id = $1`,
        [exercise.dailyExerciseId]
      );
      continue;
    }

    const bestSet = validSets.reduce((best, current) => {
      const currentWeight = Number(current.weight) || 0;
      const currentReps = Number(current.reps) || 0;
      const currentOneRep = calculateEstimatedOneRepMax(currentWeight, currentReps);
      const bestWeight = Number(best.weight) || 0;
      const bestReps = Number(best.reps) || 0;
      const bestOneRep = calculateEstimatedOneRepMax(bestWeight, bestReps);

      const currentMetric = currentWeight > 0 ? currentOneRep : currentReps;
      const bestMetric = bestWeight > 0 ? bestOneRep : bestReps;

      if (currentMetric > bestMetric) return current;
      if (currentMetric === bestMetric && currentWeight > bestWeight) return current;
      if (currentMetric === bestMetric && currentWeight === bestWeight && currentReps > bestReps) return current;
      return best;
    }, validSets[0]);

    const bestSetWeight = Number(bestSet.weight) || 0;
    const bestSetReps = Number(bestSet.reps) || 0;
    const estimatedOneRepMax = calculateEstimatedOneRepMax(bestSetWeight, bestSetReps);
    const totalSetVolume = validSets.reduce((sum, row) => sum + ((Number(row.weight) || 0) * (Number(row.reps) || 0)), 0);
    const metricType = bestSetWeight > 0 ? 'estimated_1rm' : 'max_reps';
    const metricValue = metricType === 'estimated_1rm' ? estimatedOneRepMax : bestSetReps;
    const metricKey = `${exercise.exerciseId}:${metricType}`;

    const existingUserPr = userPrMap.get(metricKey);
    const existingWorldPr = globalPrMap.get(metricKey);
    const previousUserValue = Number(existingUserPr?.metric_value) || 0;
    const previousWorldValue = Number(existingWorldPr?.metric_value) || 0;
    const sameWorkoutOwnPr =
      existingUserPr &&
      Number(existingUserPr.daily_workout_id) === workoutId &&
      metricValue >= previousUserValue;
    const sameWorkoutWorldPr =
      existingWorldPr &&
      Number(existingWorldPr.daily_workout_id) === workoutId &&
      metricValue >= previousWorldValue;
    const isPersonalRecord = metricValue > previousUserValue || sameWorkoutOwnPr;
    const isWorldRecord = metricValue > previousWorldValue || sameWorkoutWorldPr;
    const personalRecordValue = Math.max(metricValue, previousUserValue);
    const worldRecordValue = Math.max(metricValue, previousWorldValue);

    if (isPersonalRecord) {
      await client.query(
        `INSERT INTO user_exercise_prs
           (user_id, exercise_id, metric_type, metric_value, source_weight, source_reps, source_volume, daily_workout_id, daily_exercise_id, achieved_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         ON CONFLICT (user_id, exercise_id, metric_type)
         DO UPDATE SET
           metric_value = EXCLUDED.metric_value,
           source_weight = EXCLUDED.source_weight,
           source_reps = EXCLUDED.source_reps,
           source_volume = EXCLUDED.source_volume,
           daily_workout_id = EXCLUDED.daily_workout_id,
           daily_exercise_id = EXCLUDED.daily_exercise_id,
           achieved_at = NOW(),
           updated_at = NOW()`,
        [userId, exercise.exerciseId, metricType, metricValue, bestSetWeight, bestSetReps, totalSetVolume, workoutId, exercise.dailyExerciseId]
      );
    }

    if (isWorldRecord) {
      await client.query(
        `INSERT INTO global_exercise_prs
           (exercise_id, metric_type, metric_value, source_weight, source_reps, source_volume, user_id, daily_workout_id, daily_exercise_id, achieved_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         ON CONFLICT (exercise_id, metric_type)
         DO UPDATE SET
           metric_value = EXCLUDED.metric_value,
           source_weight = EXCLUDED.source_weight,
           source_reps = EXCLUDED.source_reps,
           source_volume = EXCLUDED.source_volume,
           user_id = EXCLUDED.user_id,
           daily_workout_id = EXCLUDED.daily_workout_id,
           daily_exercise_id = EXCLUDED.daily_exercise_id,
           achieved_at = NOW(),
           updated_at = NOW()`,
        [exercise.exerciseId, metricType, metricValue, bestSetWeight, bestSetReps, totalSetVolume, userId, workoutId, exercise.dailyExerciseId]
      );
    }

    await client.query(
      `UPDATE daily_workout_exercises
       SET best_set_weight = $1,
           best_set_reps = $2,
           estimated_1rm = $3,
           total_set_volume = $4,
           record_metric_type = $5,
           is_personal_record = $6,
           is_world_record = $7,
           personal_record_value = $8,
           world_record_value = $9
       WHERE id = $10`,
      [
        bestSetWeight,
        bestSetReps,
        estimatedOneRepMax,
        totalSetVolume,
        metricType,
        isPersonalRecord,
        isWorldRecord,
        personalRecordValue,
        worldRecordValue,
        exercise.dailyExerciseId,
      ]
    );

    exercisePrs.push({
      dailyExerciseId: exercise.dailyExerciseId,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      metricType,
      metricValue,
      bestSetWeight,
      bestSetReps,
      totalSetVolume,
      isPersonalRecord,
      isWorldRecord,
      personalRecordValue,
      worldRecordValue,
      personalRecordLabel: formatRecordValue(metricType, personalRecordValue),
      worldRecordLabel: formatRecordValue(metricType, worldRecordValue),
    });
  }

  return { calorieSummary, exercisePrs };
}

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
    const workoutId = parseInt(id);
    const userId = req.user.id;

    console.log(`[Daily] Finishing workout ${id} for user ${userId}`);
    console.log('[Daily] Body:', req.body);

    try {
      const { water_intake_liters, post_workout_weight, photos, total_rest_seconds } = req.body;
      const existingWorkoutRes = await pool.query(
        'SELECT status FROM daily_workouts WHERE id = $1 AND user_id = $2',
        [workoutId, userId]
      );

      if (existingWorkoutRes.rows.length === 0) {
        return res.status(404).json({ error: 'Workout not found or unauthorized' });
      }

      const wasAlreadyCompleted = existingWorkoutRes.rows[0].status === 'completed';
      
      console.log(`[Daily] Processing metrics for workout ${id}:`, {
        water: water_intake_liters,
        weight: post_workout_weight,
        photosCount: Array.isArray(photos) ? photos.length : 0
      });

      // Check if all exercises are done or skipped
      const exercisesCheck = await pool.query(
        'SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = $1 AND is_completed = false',
        [workoutId]
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

      queryParams.push(workoutId, userId);
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
        await pool.query('DELETE FROM daily_workout_photos WHERE daily_workout_id = $1', [workoutId]);
        for (const photoUrl of photos) {
          await pool.query(
            'INSERT INTO daily_workout_photos (daily_workout_id, photo_url) VALUES ($1, $2)',
            [workoutId, photoUrl]
          );
        }
      }

      // Sync post-workout weight to weight_logs for weight tracker
      if (post_workout_weight && parseFloat(post_workout_weight) > 0) {
        await pool.query(
          'INSERT INTO weight_logs (user_id, weight, notes) VALUES ($1, $2, $3)',
          [userId, parseFloat(post_workout_weight), `Post-workout: ${id}`]
        );
      }

      const analytics = await syncWorkoutCompletionAnalytics(pool, workoutId, userId);
      result.rows[0].calories_burned = analytics.calorieSummary.caloriesBurned;
      result.rows[0].workout_met = analytics.calorieSummary.workoutMet;
      result.rows[0].calories_burned_method = analytics.calorieSummary.method;
      result.rows[0].exercise_prs = analytics.exercisePrs;

      console.log(`[Daily] Workout ${id} successfully finalized. Status: ${result.rows[0].status}`);

      // ─── STREAK CALCULATION ───
      try {
        if (!wasAlreadyCompleted) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // 1. Check for any skips in this workout
        const skippedCheck = await pool.query(
          'SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = $1 AND is_skipped = true',
          [workoutId]
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
          WHERE dw.id = $1 AND COALESCE(dws.is_skipped, false) = false
          GROUP BY dw.id
        `, [workoutId]);

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

          // Delegate unified XP and Tier update
          const awardRes = await awardXP(pool, userId, earnedXP, 'Completed workout');
          
          result.rows[0].earned_xp = earnedXP;
          result.rows[0].new_level = awardRes.level;
          result.rows[0].leveled_up = awardRes.leveledUp;
          result.rows[0].total_xp = awardRes.newXP;
          result.rows[0].league_tier = awardRes.tier;
        }

        result.rows[0].new_streak = newStreak;
        } else {
          const streakRes = await pool.query('SELECT current_streak FROM users WHERE id = $1', [userId]);
          result.rows[0].new_streak = parseInt(streakRes.rows[0]?.current_streak) || 0;
        }
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

// ── GET /daily/dashboard — Home screen aggregate data ─────────────────────────
router.get('/dashboard', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  try {
    // ── 1. User stats ─────────────────────────────────────────────────────────
    const userRes = await pool.query(
      `SELECT full_name, fitness_goal, experience_level, total_xp, level, league_tier,
              current_streak, weight, profile_pic_url, gender, height, body_fat, water_intake,
              dob, onboarding_completed, activity_level, neck, waist, chest, medication,
              diet_type, food_preference
       FROM users WHERE id = $1`,
      [userId]
    );
    const user = userRes.rows[0] || {};
    const profileWeightKg = parseFloat(user.weight) || 70;

    // ── 1b. Latest post-workout weight (fallback to profile weight) ──────────
    const latestWeightRes = await pool.query(
      `SELECT post_workout_weight FROM daily_workouts
       WHERE user_id = $1 AND post_workout_weight IS NOT NULL AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`,
      [userId]
    );
    const latestLogWeight = latestWeightRes.rows[0]?.post_workout_weight;
    const weightKg = latestLogWeight ? parseFloat(latestLogWeight) : profileWeightKg;

    // ── 2. Today's completed workouts ─────────────────────────────────────────
    const todayWorkoutsRes = await pool.query(
      `SELECT id, title, total_duration_seconds, total_volume, status, completed_at, post_workout_weight, calories_burned
       FROM daily_workouts
       WHERE user_id = $1 AND status = 'completed'
         AND completed_at BETWEEN $2 AND $3
       ORDER BY completed_at DESC`,
      [userId, todayStart.toISOString(), todayEnd.toISOString()]
    );

    // Calories burned using MET formula: kcal = MET × weight_kg × duration_hours
    // MET 5 = vigorous weight training
    let totalCaloriesBurned = 0;
    let totalDurationToday = 0;
    let totalVolumeToday = 0;
    todayWorkoutsRes.rows.forEach(w => {
      const kcal = parseInt(w.calories_burned) || 0;
      totalCaloriesBurned += kcal;
      totalDurationToday += parseInt(w.total_duration_seconds) || 0;
      totalVolumeToday += parseFloat(w.total_volume) || 0;
    });

    // ── 3. Today's water intake ───────────────────────────────────────────────
    const waterRes = await pool.query(
      `SELECT COALESCE(SUM(amount_ml), 0) AS total_ml
       FROM water_logs
       WHERE user_id = $1 AND logged_at BETWEEN $2 AND $3`,
      [userId, todayStart.toISOString(), todayEnd.toISOString()]
    );
    const waterMl = parseInt(waterRes.rows[0]?.total_ml) || 0;

    // ── 4. Today's calories consumed ──────────────────────────────────────────
    const mealsRes = await pool.query(
      `SELECT COALESCE(SUM(total_calories), 0) AS total_cals
       FROM meals
       WHERE user_id = $1 AND logged_at BETWEEN $2 AND $3`,
      [userId, todayStart.toISOString(), todayEnd.toISOString()]
    );
    const caloriesConsumed = Math.round(parseFloat(mealsRes.rows[0]?.total_cals) || 0);

    // ── 5. Weekly workout stats (last 7 days) ─────────────────────────────────
    const weeklyRes = await pool.query(
      `SELECT
         DATE(completed_at AT TIME ZONE 'UTC') AS day,
         COUNT(*) AS workouts,
         COALESCE(SUM(total_duration_seconds), 0) AS total_seconds,
         COALESCE(SUM(total_volume), 0) AS total_volume
       FROM daily_workouts
       WHERE user_id = $1 AND status = 'completed'
         AND completed_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(completed_at AT TIME ZONE 'UTC')
       ORDER BY day ASC`,
      [userId]
    );

    // Build 7-day grid (fill missing days with 0)
    const weeklyStats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const found = weeklyRes.rows.find(r => r.day === dayStr);
      weeklyStats.push({
        date: dayStr,
        label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
        workouts: parseInt(found?.workouts) || 0,
        duration_seconds: parseInt(found?.total_seconds) || 0,
        volume: parseFloat(found?.total_volume) || 0,
      });
    }

    // ── 6. Weight progress (last 7 post_workout weights) ──────────────────────
    const weightRes = await pool.query(
      `SELECT post_workout_weight AS weight, DATE(completed_at) AS day
       FROM daily_workouts
       WHERE user_id = $1 AND post_workout_weight IS NOT NULL AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 7`,
      [userId]
    );
    const weightProgress = weightRes.rows.reverse();

    // ── 7. Top recommended exercises ───────────────────────────────────────────
    const topExerciseRes = await pool.query(
      `SELECT e.id AS exercise_id, e.name AS exercise_name, e.target, e.category, e.image_url, e.equipment,
              ROUND(AVG(dwe.rating)::numeric, 1)::float8 as rating
       FROM exercises e
       INNER JOIN daily_workout_exercises dwe ON e.id = dwe.exercise_id AND dwe.rating IS NOT NULL
       GROUP BY e.id
       ORDER BY rating DESC
       LIMIT 4`
    );
    
    const topRecs = topExerciseRes.rows.map(r => ({
      ...r,
      scoreTag: r.rating >= 8.0 ? 'Highly Rated' : 'Recommended',
    }));

    // ── 8. Muscle Activity (last 7 days) ───────────────────────────────────────
    const muscleRes = await pool.query(
      `SELECT e.target, COUNT(*) as count
       FROM daily_workout_exercises dwe
       JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
       JOIN exercises e ON dwe.exercise_id = e.id
       WHERE dw.user_id = $1 AND dw.status = 'completed'
         AND dw.completed_at >= NOW() - INTERVAL '7 days'
       GROUP BY e.target`,
      [userId]
    );
    
    // Map db targets to react-native-body-highlighter slugs
    const targetToSlug = {
      'Chest': 'chest',
      'Back': 'upper-back',
      'Lats': 'upper-back',
      'Lower Back': 'lower-back',
      'Shoulders': 'deltoids',
      'Biceps': 'biceps',
      'Triceps': 'triceps',
      'Forearms': 'forearm',
      'Abs': 'abs',
      'Obliques': 'obliques',
      'Glutes': 'gluteal',
      'Quads': 'quadriceps',
      'Hamstrings': 'hamstring',
      'Calves': 'calves',
      'Traps': 'trapezius',
      'Neck': 'neck',
      'Adductors': 'adductors'
    };

    const muscleActivity = [];
    muscleRes.rows.forEach(r => {
      if (!r.target) return;
      // Normalise to match dictionary keys (e.g., "chest" -> "Chest")
      const targetStr = r.target.charAt(0).toUpperCase() + r.target.slice(1).toLowerCase();
      const slug = targetToSlug[targetStr];
      if (slug) {
        const intensity = parseInt(r.count) >= 3 ? 2 : 1;
        const existing = muscleActivity.find(m => m.slug === slug);
        if (existing) {
          existing.intensity = Math.min(2, existing.intensity + intensity);
        } else {
          muscleActivity.push({ slug, intensity });
        }
      }
    });
    res.json({
      user: {
        full_name: user.full_name,
        fitness_goal: user.fitness_goal,
        experience_level: user.experience_level,
        total_xp: parseInt(user.total_xp) || 0,
        level: parseInt(user.level) || 1,
        league_tier: user.league_tier || 'Bronze',
        current_streak: parseInt(user.current_streak) || 0,
        weight: weightKg,
        profile_pic_url: user.profile_pic_url,
        gender: user.gender,
        height: user.height,
        body_fat: user.body_fat,
        water_intake: user.water_intake,
        dob: user.dob,
        onboarding_completed: user.onboarding_completed,
        activity_level: user.activity_level,
        neck: user.neck,
        waist: user.waist,
        chest: user.chest,
        medication: user.medication,
        diet_type: user.diet_type,
        food_preference: user.food_preference,
      },
      today: {
        workouts_completed: todayWorkoutsRes.rows.length,
        calories_burned: totalCaloriesBurned,
        duration_seconds: totalDurationToday,
        volume: totalVolumeToday,
        water_ml: waterMl,
        calories_consumed: caloriesConsumed,
      },
      weekly_stats: weeklyStats,
      weight_progress: weightProgress,
      top_recommendations: topRecs,
      muscle_activity: muscleActivity,
    });
  } catch (err) {
    console.error('GET /daily/dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
