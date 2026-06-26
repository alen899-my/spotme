const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const upload = require('../uploadConfig');
const { awardXP } = require('../utils/xp');
const { sendPush, sendRandomMotivation } = require('../utils/pushNotifications');
const {
  parseWeightKg,
  calculateEstimatedOneRepMax,
  estimateWorkoutCalories,
  formatRecordValue,
} = require('../utils/workoutAnalytics');
const { callAI } = require('../utils/ai');

// ── Helper: format seconds to MM:SS ───────────────────────────────────────────
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Simple TTL-based route cache ─────────────────────────────────────────────
const routeCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached(key) {
  const entry = routeCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    routeCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  routeCache.set(key, { data, ts: Date.now() });
}

function invalidateCache(pattern) {
  for (const key of routeCache.keys()) {
    if (key.startsWith(pattern)) routeCache.delete(key);
  }
}

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

// ── GET /daily/workouts — list past workouts for user (paginated) ──────────
router.get('/workouts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM daily_workouts WHERE user_id = $1`,
      [userId]
    );
    const total = parseInt(countRes.rows[0]?.total) || 0;

    const result = await pool.query(
      `SELECT dw.*,
        ws.name AS split_name,
        wsess.name AS session_name,
        (SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = dw.id) AS exercise_count,
        (SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = dw.id AND is_completed = true) AS completed_count,
        (SELECT COUNT(*) FROM daily_workout_sets dws 
         JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id 
         WHERE dwe.daily_workout_id = dw.id AND dws.is_skipped = false) AS total_sets,
        (SELECT photo_url FROM daily_workout_photos WHERE daily_workout_id = dw.id ORDER BY created_at ASC LIMIT 1) AS cover_photo_url,
        (SELECT id FROM workout_reports WHERE daily_workout_id = dw.id AND user_id = $1 LIMIT 1) AS report_id,
        (SELECT status FROM workout_reports WHERE daily_workout_id = dw.id AND user_id = $1 LIMIT 1) AS report_status
       FROM daily_workouts dw
       LEFT JOIN workout_splits ws ON dw.split_id = ws.id
       LEFT JOIN workout_sessions wsess ON dw.session_id = wsess.id
       WHERE dw.user_id = $1
       ORDER BY dw.started_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({ workouts: result.rows, total, page, limit });
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
    const { shared } = req.query;
    let whereClause = 'dw.id = $1';
    const params = [parseInt(req.params.id)];

    if (shared === '1') {
      // Shared view — any authenticated user can view if owner's profile is public,
      // or if the requester follows the owner with an accepted follow request
      whereClause += ` AND EXISTS (
        SELECT 1 FROM users u WHERE u.id = dw.user_id AND (
          u.is_private = false OR u.id = $2 OR EXISTS (
            SELECT 1 FROM follows
            WHERE follower_id = $2 AND following_id = u.id AND status = 'accepted'
          )
        )
      )`;
      params.push(req.user.id);
    } else {
      // Own workout — filter by user_id
      whereClause += ' AND dw.user_id = $2';
      params.push(req.user.id);
    }

    const workout = await pool.query(
      `SELECT dw.*,
        u.full_name AS owner_name, u.profile_pic_url AS owner_pic,
        ws.name AS split_name, 
        wsess.name AS session_name,
        (SELECT COUNT(*) FROM daily_workout_sets dws 
         JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id 
         WHERE dwe.daily_workout_id = dw.id AND dws.is_skipped = false) AS total_sets,
        (SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = dw.id) AS exercise_count,
        (SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = dw.id AND is_completed = true) AS completed_count
       FROM daily_workouts dw
       JOIN users u ON dw.user_id = u.id
       LEFT JOIN workout_splits ws ON dw.split_id = ws.id
       LEFT JOIN workout_sessions wsess ON dw.session_id = wsess.id
       WHERE ${whereClause}`,
      params
    );
    if (workout.rows.length === 0) return res.status(404).json({ error: 'Workout not found' });

    const exercises = await pool.query(
      `SELECT dwe.*, e.name, e.image_url, e.gif_url, e.instructions_en, e.target, e.equipment, e.category,
              e.avg_rating::float8 AS rating, e.rating_count
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

      // Auto-complete/update exercise skip and completion status when set is logged
      const exerciseInfo = await pool.query(
        'SELECT target_sets, is_skipped, is_completed FROM daily_workout_exercises WHERE id = $1',
        [parseInt(req.params.id)]
      );
      const setCount = await pool.query(
        'SELECT COUNT(*) FROM daily_workout_sets WHERE daily_exercise_id = $1',
        [parseInt(req.params.id)]
      );

      if (exerciseInfo.rows.length > 0) {
        const targetSets = exerciseInfo.rows[0].target_sets;
        const loggedSetsCount = parseInt(setCount.rows[0].count);
        let isCompleted = loggedSetsCount >= targetSets;
        let isSkippedUpdate = exerciseInfo.rows[0].is_skipped;

        if (!is_skipped) {
          isSkippedUpdate = false;
        }

        await pool.query(
          'UPDATE daily_workout_exercises SET is_skipped = $1, is_completed = $2 WHERE id = $3',
          [isSkippedUpdate, isCompleted, parseInt(req.params.id)]
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

async function completeWorkoutBackground(workoutId, userId) {
  try {
    const analytics = await syncWorkoutCompletionAnalytics(pool, workoutId, userId);

    // ── Streak + XP ──────────────────────────────────────────────────────
    const wasAlreadyCompleted = false; // fresh DB read
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const skippedCheck = await pool.query(
      'SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = $1 AND is_skipped = true',
      [workoutId]
    );
    const hasSkips = parseInt(skippedCheck.rows[0].count) > 0;

    const userRes = await pool.query(
      'SELECT current_streak, last_workout_date FROM users WHERE id = $1',
      [userId]
    );
    const { current_streak, last_workout_date } = userRes.rows[0];
    let newStreak = current_streak || 0;

    if (hasSkips) {
      newStreak = 0;
    } else {
      if (!last_workout_date) {
        newStreak = 1;
      } else {
        const lastDateStr = new Date(last_workout_date).toISOString().split('T')[0];
        if (lastDateStr === today) {
          // no change
        } else if (lastDateStr === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }
    }

    await pool.query(
      'UPDATE users SET current_streak = $1, last_workout_date = $2 WHERE id = $3',
      [newStreak, today, userId]
    );

    // XP calculation
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
      const streakMultiplier = 1 + Math.min((newStreak * 0.05), 0.5);
      earnedXP = Math.round(earnedXP * streakMultiplier);

      await awardXP(pool, userId, earnedXP, 'Completed workout');
    }

    await pool.query(
      'UPDATE daily_workouts SET streak_at_completion = $1 WHERE id = $2',
      [newStreak, workoutId]
    );

    sendRandomMotivation(userId).catch(() => {});
  } catch (err) {
    console.error('[Background] Post-workout analytics failed:', err);
  }
}

// ── PATCH /daily/workouts/:id/complete — finish the workout ──────────────────
router.patch(
  '/workouts/:id/complete',
  authenticateToken,
  validate(schemas.completeWorkout),
  async (req, res) => {
    const { id } = req.params;
    const workoutId = parseInt(id);
    const userId = req.user.id;

    try {
      const { total_duration_seconds, total_volume, notes, completion_photo_url,
              water_intake_liters, post_workout_weight, photos, total_rest_seconds } = req.body;

      const existingWorkoutRes = await pool.query(
        'SELECT status FROM daily_workouts WHERE id = $1 AND user_id = $2',
        [workoutId, userId]
      );

      if (existingWorkoutRes.rows.length === 0) {
        return res.status(404).json({ error: 'Workout not found or unauthorized' });
      }

      const wasAlreadyCompleted = existingWorkoutRes.rows[0].status === 'completed';

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

      const result = await pool.query(query, queryParams);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Workout not found or unauthorized' });
      }

      // Handle multi-photos if provided (lightweight, keep synchronous)
      if (Array.isArray(photos)) {
        await pool.query('DELETE FROM daily_workout_photos WHERE daily_workout_id = $1', [workoutId]);
        for (const photoUrl of photos) {
          await pool.query(
            'INSERT INTO daily_workout_photos (daily_workout_id, photo_url) VALUES ($1, $2)',
            [workoutId, photoUrl]
          );
        }
      }

      // Sync post-workout weight to weight_logs
      if (post_workout_weight && parseFloat(post_workout_weight) > 0) {
        await pool.query(
          'INSERT INTO weight_logs (user_id, weight, notes) VALUES ($1, $2, $3)',
          [userId, parseFloat(post_workout_weight), `Post-workout: ${id}`]
        );
      }

      // ── Respond immediately ───────────────────────────────────────────
      res.json({
        ...result.rows[0],
        photos: photos || [],
        earned_xp: 0,
        new_streak: 0,
        leveled_up: false,
        exercise_prs: [],
      });

      // Invalidate route cache
      invalidateCache(`calendar-stats:${userId}`);
      invalidateCache(`dashboard:${userId}`);

      // ── Pre-warm dashboard cache in background ──────────────────────
      setImmediate(async () => {
        try {
          const freshData = await buildDashboardData(userId);
          setCache(`dashboard:${userId}`, freshData);
        } catch (e) {
          // Silently ignore — next request will cold-fill the cache
        }
      });

      // ── Heavy analytics + streak + XP in background ──────────────────
      if (!wasAlreadyCompleted) {
        setImmediate(() => completeWorkoutBackground(workoutId, userId));
      }
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

    invalidateCache(`calendar-stats:${userId}`);
    invalidateCache(`dashboard:${userId}`);

    setImmediate(async () => {
      try {
        const freshData = await buildDashboardData(userId);
        setCache(`dashboard:${userId}`, freshData);
      } catch (e) {}
    });

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

    // Sync post-workout weight to weight_logs
    if (post_workout_weight && parseFloat(post_workout_weight) > 0) {
      await pool.query(
        'INSERT INTO weight_logs (user_id, weight, notes) VALUES ($1, $2, $3)',
        [userId, parseFloat(post_workout_weight), `Post-workout: ${id}`]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /daily/workouts/:id/metrics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /daily/workouts/:id/recalculate — recalc volume, calories, PRs after edits ──
router.patch('/workouts/:id/recalculate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const workoutId = parseInt(id);

    // Verify ownership
    const workoutCheck = await pool.query(
      'SELECT id FROM daily_workouts WHERE id = $1 AND user_id = $2',
      [workoutId, userId]
    );
    if (workoutCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found or unauthorized' });
    }

    // Recalculate total_volume by summing weight * reps across non-skipped sets
    const volumeRes = await pool.query(
      `SELECT COALESCE(SUM(dws.weight * dws.reps), 0) AS total_volume
       FROM daily_workout_sets dws
       JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id
       WHERE dwe.daily_workout_id = $1 AND COALESCE(dws.is_skipped, false) = false`,
      [workoutId]
    );
    const totalVolume = parseFloat(volumeRes.rows[0]?.total_volume) || 0;
    await pool.query(
      'UPDATE daily_workouts SET total_volume = $1 WHERE id = $2',
      [totalVolume, workoutId]
    );

    // Re-check exercise completion statuses
    const exercises = await pool.query(
      `SELECT dwe.id, dwe.target_sets,
        (SELECT COUNT(*) FROM daily_workout_sets WHERE daily_exercise_id = dwe.id AND is_skipped = false) AS completed_sets
       FROM daily_workout_exercises dwe
       WHERE dwe.daily_workout_id = $1`,
      [workoutId]
    );
    for (const ex of exercises.rows) {
      if (parseInt(ex.completed_sets) >= ex.target_sets) {
        await pool.query(
          'UPDATE daily_workout_exercises SET is_completed = true WHERE id = $1 AND is_completed = false',
          [ex.id]
        );
      } else if (parseInt(ex.completed_sets) < ex.target_sets) {
        await pool.query(
          'UPDATE daily_workout_exercises SET is_completed = false WHERE id = $1 AND is_completed = true',
          [ex.id]
        );
      }
    }

    // Re-run analytics (calories, PRs, best sets, etc.)
    await syncWorkoutCompletionAnalytics(pool, workoutId, userId);

    // Fetch and return the updated workout
    const updated = await pool.query(
      'SELECT * FROM daily_workouts WHERE id = $1',
      [workoutId]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('PATCH /daily/workouts/:id/recalculate error:', err);
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
      `SELECT dw.user_id, dws.daily_exercise_id
       FROM daily_workout_sets dws
       JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id
       JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
       WHERE dws.id = $1`,
      [parseInt(id)]
    );

    if (setCheck.rows.length === 0) return res.status(404).json({ error: 'Set not found' });
    if (setCheck.rows[0].user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const exerciseId = setCheck.rows[0].daily_exercise_id;

    await pool.query('DELETE FROM daily_workout_sets WHERE id = $1', [parseInt(id)]);

    // If the exercise now has fewer sets than target, un-complete it
    const remainingRes = await pool.query(
      'SELECT COUNT(*) FROM daily_workout_sets WHERE daily_exercise_id = $1',
      [exerciseId]
    );
    const targetRes = await pool.query(
      'SELECT target_sets FROM daily_workout_exercises WHERE id = $1',
      [exerciseId]
    );
    if (
      targetRes.rows.length > 0 &&
      parseInt(remainingRes.rows[0].count) < targetRes.rows[0].target_sets
    ) {
      await pool.query(
        'UPDATE daily_workout_exercises SET is_completed = false WHERE id = $1',
        [exerciseId]
      );
    }

    res.json({ success: true, message: 'Set deleted' });
  } catch (err) {
    console.error('DELETE /daily/sets/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /daily/sets/:id — edit a single set ────────────────────────────────
router.patch('/sets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { weight, reps, duration_seconds, rest_seconds } = req.body;

    // Verify ownership with same JOIN chain as DELETE
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

    // Build dynamic update (only include fields that are provided)
    const updateFields = [];
    const queryParams = [];
    let paramIdx = 1;

    if (weight !== undefined) {
      updateFields.push(`weight = $${paramIdx}`);
      queryParams.push(parseFloat(weight));
      paramIdx++;
    }
    if (reps !== undefined) {
      updateFields.push(`reps = $${paramIdx}`);
      queryParams.push(parseInt(reps));
      paramIdx++;
    }
    if (duration_seconds !== undefined) {
      updateFields.push(`duration_seconds = $${paramIdx}`);
      queryParams.push(parseInt(duration_seconds));
      paramIdx++;
    }
    if (rest_seconds !== undefined) {
      updateFields.push(`rest_seconds = $${paramIdx}`);
      queryParams.push(parseInt(rest_seconds));
      paramIdx++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    queryParams.push(parseInt(id));
    const result = await pool.query(
      `UPDATE daily_workout_sets SET ${updateFields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      queryParams
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /daily/sets/:id error:', err);
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
      `SELECT dwe.id, dwe.exercise_id
       FROM daily_workout_exercises dwe
       JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
       WHERE dwe.id = $1 AND dw.user_id = $2`,
      [parseInt(id), userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Workout exercise not found or unauthorized' });
    }

    const exerciseId = check.rows[0].exercise_id;

    // Update global exercise rating using a weighted average
    await pool.query(
      `UPDATE exercises
       SET avg_rating = ROUND((COALESCE(avg_rating, 0) * COALESCE(rating_count, 0) + $1) / (COALESCE(rating_count, 0) + 1)::numeric, 1),
           rating_count = rating_count + 1
       WHERE id = $2`,
      [parseInt(rating), exerciseId]
    );

    const updated = await pool.query(
      `SELECT id, name, avg_rating::float8 AS rating FROM exercises WHERE id = $1`,
      [exerciseId]
    );

    res.json(updated.rows[0]);
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
    // 1. Fetch all workout sessions available to the user
    const sessionsRes = await pool.query(`
      SELECT ws.id AS session_id, ws.name AS session_name, s.id AS split_id, s.name AS split_name
      FROM workout_sessions ws
      JOIN workout_splits s ON ws.split_id = s.id
      WHERE s.user_id = $1
    `, [userId]);

    if (sessionsRes.rows.length === 0) {
      return res.json([]); // No sessions available to recommend
    }

    // 2. Fetch all global exercise ratings
    const exerciseRatingsRes = await pool.query(`
      SELECT id AS exercise_id, avg_rating::float8 AS avg_rating, rating_count
      FROM exercises
      WHERE rating_count > 0
    `);

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
      exerciseRatings[row.exercise_id] = row.avg_rating;
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
        score,
        reason,
        scoreTag,
        exercise_count: exercises.length,
        targets: targets.slice(0, 3), // Return up to 3 targets
        sample_image: exercises[0]?.image_url || null,
        exercises: exercises.slice(0, 5) // Return first 5 exercise previews
      };
    });

    // Sort by score desc
    scoredSessions.sort((a, b) => {
      return b.score - a.score;
    });

    // Return the top 3 recommendations
    res.json(scoredSessions.slice(0, 3));
  } catch (err) {
    console.error('GET /daily/recommendations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Reusable dashboard data builder (for route + cache pre-warm) ──────────
async function buildDashboardData(userId) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const todayISO = todayStart.toISOString();
  const todayEndISO = todayEnd.toISOString();

  const mainRes = await pool.query(`
      WITH
      u AS (
        SELECT full_name, fitness_goal, experience_level, total_xp, level, league_tier,
               current_streak, weight, profile_pic_url, gender, height, body_fat, water_intake,
               dob, onboarding_completed, activity_level, neck, waist, chest, medication,
               diet_type, food_preference
        FROM users WHERE id = $1
      ),
      latest_weight AS (
        SELECT post_workout_weight FROM daily_workouts
        WHERE user_id = $1 AND post_workout_weight IS NOT NULL AND status = 'completed'
        ORDER BY completed_at DESC LIMIT 1
      ),
      today_workouts AS (
        SELECT COALESCE(SUM(calories_burned), 0) AS total_calories,
               COALESCE(SUM(total_duration_seconds), 0) AS total_duration,
               COALESCE(SUM(total_volume), 0) AS total_vol,
               COUNT(*) AS w_count
        FROM daily_workouts
        WHERE user_id = $1 AND status = 'completed'
          AND completed_at >= $2 AND completed_at <= $3
      ),
      today_water AS (
        SELECT COALESCE(SUM(amount_ml), 0) AS total_ml
        FROM water_logs
        WHERE user_id = $1 AND logged_at >= $2 AND logged_at <= $3
      ),
      today_cals AS (
        SELECT COALESCE(SUM(total_calories), 0) AS total_cals
        FROM meals
        WHERE user_id = $1 AND logged_at >= $2 AND logged_at <= $3
      ),
      weekly_raw AS (
        SELECT DATE(completed_at) AS day,
               COUNT(*) AS workouts,
               COALESCE(SUM(total_duration_seconds), 0) AS total_seconds,
               COALESCE(SUM(total_volume), 0) AS total_vol
        FROM daily_workouts
        WHERE user_id = $1 AND status = 'completed'
          AND completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(completed_at)
        ORDER BY day ASC
      ),
      weight_progress AS (
        SELECT post_workout_weight AS weight, DATE(completed_at) AS day
        FROM daily_workouts
        WHERE user_id = $1 AND post_workout_weight IS NOT NULL AND status = 'completed'
        ORDER BY completed_at DESC LIMIT 7
      ),
      total_count AS (
        SELECT COUNT(*) AS total FROM daily_workouts WHERE user_id = $1 AND status = 'completed'
      )
      SELECT
        (SELECT row_to_json(u) FROM u) AS user_data,
        (SELECT post_workout_weight FROM latest_weight) AS latest_weight,
        (SELECT total_calories FROM today_workouts) AS today_calories,
        (SELECT total_duration FROM today_workouts) AS today_duration,
        (SELECT total_vol FROM today_workouts) AS today_volume,
        (SELECT w_count FROM today_workouts) AS today_count,
        (SELECT total_ml FROM today_water) AS water_ml,
        (SELECT total_cals FROM today_cals) AS cals_consumed,
        (SELECT json_agg(weekly_raw ORDER BY day ASC) FROM weekly_raw) AS weekly,
        (SELECT json_agg(wp ORDER BY wp.day ASC) FROM weight_progress wp) AS weight_prog,
        (SELECT total FROM total_count) AS total_workouts
    `, [userId, todayISO, todayEndISO]);

    const r = mainRes.rows[0];
    const user = r?.user_data || {
      full_name: null, fitness_goal: null, experience_level: null, total_xp: 0,
      level: 1, league_tier: 'Bronze', current_streak: 0, weight: null,
      profile_pic_url: null, gender: null, height: null, body_fat: null,
      water_intake: null, dob: null, onboarding_completed: null,
      activity_level: null, neck: null, waist: null, chest: null,
      medication: null, diet_type: null, food_preference: null,
    };
    const latestLogWeight = r?.latest_weight;
    const profileWeightKg = parseFloat(user.weight) || 70;
    const weightKg = latestLogWeight ? parseFloat(latestLogWeight) : profileWeightKg;

    // Build 7-day grid (fill missing days with 0)
    const weeklyDb = r?.weekly || [];
    const weeklyStats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const found = weeklyDb.find(r => r.day === dayStr);
      weeklyStats.push({
        date: dayStr,
        label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
        workouts: parseInt(found?.workouts) || 0,
        duration_seconds: parseInt(found?.total_seconds) || 0,
        volume: parseFloat(found?.total_vol) || 0,
      });
    }

    const weightProgress = r?.weight_prog || [];

    // ── Top recommended exercises (cached on client) ───────────────────────
    const topExerciseRes = await pool.query(
      `SELECT e.id AS exercise_id, e.name AS exercise_name, e.target, e.category, e.image_url, e.gif_url, e.equipment,
              e.avg_rating::float8 AS rating
       FROM exercises e
       WHERE e.rating_count > 0
       ORDER BY e.avg_rating DESC, e.rating_count DESC
       LIMIT 5`
    );
    const topRecs = topExerciseRes.rows.map(r => ({
      ...r,
      scoreTag: r.rating >= 8.0 ? 'Highly Rated' : r.rating > 0 ? 'Recommended' : 'Try This',
    }));

    // ── Muscle Activity — decay-weighted, date-aware ──────────────────────
    const muscleRes = await pool.query(
      `SELECT e.target,
              e.body_part,
              e.category,
              DATE(dw.completed_at) AS workout_date,
              COUNT(*)::int AS count
       FROM daily_workout_exercises dwe
       JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
       JOIN exercises e ON dwe.exercise_id = e.id
       WHERE dw.user_id = $1 AND dw.status = 'completed'
       GROUP BY e.target, e.body_part, e.category,
                DATE(dw.completed_at)`,
      [userId]
    );

    // ── Exhaustive slug map ────────────────────────────────────────────────────
    // Covers every distinct value found in exercises.json across the
    // `target`, `body_part`, `category`, and `muscle_group` columns.
    // Each value (lower-cased) maps to a react-native-body-highlighter slug.
    const toSlug = {
      // ── target column values ───────────────────────────────────────────────
      'abductors':            'abductors',
      'abs':                  'abs',
      'adductors':            'adductors',
      'biceps':               'biceps',
      'calves':               'calves',
      'cardiovascular system':'cardiovascular system', // no body slug – skip
      'delts':                'deltoids',
      'forearms':             'forearm',
      'glutes':               'gluteal',
      'hamstrings':           'hamstring',
      'lats':                 'upper-back',
      'levator scapulae':     'trapezius',
      'pectorals':            'chest',
      'quads':                'quadriceps',
      'serratus anterior':    'chest',        // serratus sits on the ribcage
      'spine':                'lower-back',
      'traps':                'trapezius',
      'triceps':              'triceps',
      'upper back':           'upper-back',

      // ── category / body_part column values ────────────────────────────────
      'back':                 'upper-back',
      'cardio':               null,           // no specific muscle slug
      'chest':                'chest',
      'lower arms':           'forearm',
      'lower legs':           'calves',
      'neck':                 'neck',
      'shoulders':            'deltoids',
      'upper arms':           'biceps',       // covers both bi/tri; we'll also hit triceps via target
      'upper legs':           'quadriceps',
      'waist':                'abs',

      // ── muscle_group column values ─────────────────────────────────────────
      'abdominals':           'abs',
      'ankle stabilizers':    'ankles',
      'ankles':               'ankles',
      'core':                 'abs',
      'deltoids':             'deltoids',
      'hands':                'hands',
      'hip flexors':          'abs',          // closest body slug
      'latissimus dorsi':     'upper-back',
      'lower back':           'lower-back',
      'obliques':             'obliques',
      'quadriceps':           'quadriceps',
      'rhomboids':            'upper-back',
      'rotator cuff':         'deltoids',
      'soleus':               'calves',
      'trapezius':            'trapezius',
      'upper back':           'upper-back',
      'wrist extensors':      'forearm',
      'wrist flexors':        'forearm',
      'wrists':               'forearm',
    };

    // ── Decay parameters ──────────────────────────────────────────────────────
    const HALF_LIFE_DAYS = 45;
    const nowMs = Date.now();

    // ── Build decay-weighted score per slug ───────────────────────────────────
    // For each row we resolve a slug from target → body_part → category (priority order).
    const slugScoreMap = {};
    muscleRes.rows.forEach(r => {
      // Try target first, then body_part, then category
      const candidates = [r.target, r.body_part, r.category];
      let slug = null;
      for (const raw of candidates) {
        if (!raw) continue;
        const key = raw.trim().toLowerCase();
        const mapped = toSlug[key];
        if (mapped) { slug = mapped; break; }
      }
      if (!slug) return; // unmapped / cardio – ignore

      const daysAgo = (nowMs - new Date(r.workout_date).getTime()) / 86_400_000;
      const decayFactor = Math.pow(2, -daysAgo / HALF_LIFE_DAYS);
      slugScoreMap[slug] = (slugScoreMap[slug] || 0) + r.count * decayFactor;
    });

    // ── Absolute threshold ladder ──────────────────────────────────────────────
    const THRESHOLDS = Array.from({ length: 50 }, (_, idx) => {
      const i = idx + 1;
      return Math.round((0.5 + 0.1 * i + 0.118 * i * i) * 10) / 10;
    });

    const muscleActivity = Object.entries(slugScoreMap)
      .map(([slug, score]) => {
        const intensity = THRESHOLDS.filter(t => score >= t).length; // 0 – 10
        return { slug, intensity };
      })
      .filter(m => m.intensity > 0);
    const responseData = {
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
        workouts_completed: parseInt(r?.today_count) || 0,
        calories_burned: parseInt(r?.today_calories) || 0,
        duration_seconds: parseInt(r?.today_duration) || 0,
        volume: parseFloat(r?.today_volume) || 0,
        water_ml: parseInt(r?.water_ml) || 0,
        calories_consumed: parseInt(r?.cals_consumed) || 0,
      },
      weekly_stats: weeklyStats,
      weight_progress: weightProgress,
      top_recommendations: topRecs,
      muscle_activity: muscleActivity,
      total_workouts: parseInt(r?.total_workouts) || 0,
    };

    return responseData;
}

// ── GET /daily/dashboard — Home screen aggregate data ─────────────────────────
router.get('/dashboard', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `dashboard:${userId}`;
  const cachedDashboard = getCached(cacheKey);
  if (cachedDashboard) return res.json(cachedDashboard);

  try {
    const responseData = await buildDashboardData(userId);
    setCache(cacheKey, responseData);
    res.json(responseData);
  } catch (err) {
    console.error('GET /daily/dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /daily/workouts/:id/generate-report ── Generate AI workout report ──
router.post('/workouts/:id/generate-report', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const workoutId = parseInt(req.params.id);
    const userId = req.user.id;
    const forceRetry = Boolean(req.body?.force);

    // Fetch workout with exercises and sets
    const workoutRes = await client.query(`
      SELECT dw.*, u.fitness_goal, u.experience_level, u.weight AS user_weight,
             u.gender, u.age, u.height
      FROM daily_workouts dw
      JOIN users u ON dw.user_id = u.id
      WHERE dw.id = $1 AND dw.user_id = $2 AND dw.status = 'completed'
    `, [workoutId, userId]);

    if (workoutRes.rows.length === 0) {
      return res.status(404).json({ error: 'Completed workout not found' });
    }

    const w = workoutRes.rows[0];

    if (forceRetry) {
      const oldReports = await client.query(
        'SELECT id FROM workout_reports WHERE daily_workout_id = $1 AND user_id = $2',
        [workoutId, userId]
      );
      const oldReportIds = oldReports.rows.map(row => row.id);

      if (oldReportIds.length > 0) {
        await client.query(
          'DELETE FROM notifications WHERE user_id = $1 AND type = $2 AND reference_id = ANY($3::int[])',
          [userId, 'workout_report', oldReportIds]
        );
        await client.query(
          'DELETE FROM workout_reports WHERE daily_workout_id = $1 AND user_id = $2',
          [workoutId, userId]
        );
      }
    }

    // Check if report already exists
    const existing = await client.query(
      'SELECT id, status FROM workout_reports WHERE daily_workout_id = $1 AND user_id = $2',
      [workoutId, userId]
    );
    if (existing.rows.length > 0) {
      return res.json({ report_id: existing.rows[0].id, status: existing.rows[0].status });
    }

    // Insert placeholder row with status 'generating'
    const placeholder = await client.query(
      `INSERT INTO workout_reports (user_id, daily_workout_id, summary, good_things, areas_to_improve, recommendations, status)
       VALUES ($1, $2, '', '', '', '', 'generating') RETURNING id`,
      [userId, workoutId]
    );
    const reportId = placeholder.rows[0].id;

    // Respond immediately so the client knows report is being generated
    res.json({ report_id: reportId, status: 'generating' });

    // Continue generation in background
    try {
      // ── Fetch exercises with ALL columns ───────────────────────────────
      const exercisesRes = await client.query(`
        SELECT dwe.*,
               e.name, e.category, e.muscle_group, e.target, e.body_part, e.equipment,
               e.secondary_muscles, e.avg_rating::float8 AS rating, e.rating_count
        FROM daily_workout_exercises dwe
        JOIN exercises e ON dwe.exercise_id = e.id
        WHERE dwe.daily_workout_id = $1
        ORDER BY dwe.sort_order
      `, [workoutId]);

      const setsRes = await client.query(`
        SELECT dws.*, dwe.exercise_id
        FROM daily_workout_sets dws
        JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id
        WHERE dwe.daily_workout_id = $1 AND dws.is_skipped = false
        ORDER BY dwe.sort_order, dws.set_number
      `, [workoutId]);

      const exercises = exercisesRes.rows;
      const sets = setsRes.rows;

      // ── Aggregate stats ────────────────────────────────────────────────
      const totalSets = sets.length;
      const totalReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0);
      const totalVolume = sets.reduce((sum, s) => sum + ((s.weight || 0) * (s.reps || 0)), 0);
      const skippedCount = exercises.filter(e => e.is_skipped).length;
      const estimatedRestPerSet = totalSets > 1
        ? Math.round((w.total_rest_seconds || 0) / (totalSets - 1))
        : 0;

      // ── Per-exercise advanced analytics ────────────────────────────────
      const exerciseAnalytics = exercises.map(e => {
        const exSets = sets.filter(s => s.exercise_id === e.exercise_id);
        if (exSets.length === 0) return null;

        const repsArr = exSets.map(s => s.reps || 0);
        const weightsArr = exSets.map(s => Number(s.weight) || 0);
        const repsMax = Math.max(...repsArr);
        const repsMin = Math.min(...repsArr);
        const repsDrop = repsMax - repsMin;

        const bestSet = exSets.reduce((best, s) => {
          const cw = Number(s.weight) || 0;
          const cr = s.reps || 0;
          if (cw <= 0 && cr <= 0) return best;
          if (!best) return s;
          const bw = Number(best.weight) || 0;
          const br = best.reps || 0;
          const cMetric = cw > 0 ? cw * (1 + cr / 30) : cr;
          const bMetric = bw > 0 ? bw * (1 + br / 30) : br;
          return cMetric > bMetric ? s : best;
        }, null);

        const bestW = bestSet ? Number(bestSet.weight) || 0 : 0;
        const bestR = bestSet ? bestSet.reps || 0 : 0;
        const bestE1RM = bestW > 0 ? Math.round((bestW * (1 + bestR / 30)) * 10) / 10 : bestR;

        return {
          name: e.name,
          exercise_id: e.exercise_id,
          target: e.target || '',
          category: e.category || '',
          muscle_group: e.muscle_group || '',
          body_part: e.body_part || '',
          equipment: e.equipment || '',
          target_sets: e.target_sets,
          target_reps: e.target_reps,
          target_weight: e.target_weight,
          target_rest_time: e.target_rest_time,
          sort_order: e.sort_order,
          is_completed: e.is_completed,
          is_skipped: e.is_skipped,
          total_set_volume: e.total_set_volume || 0,
          estimated_1rm: e.estimated_1rm || 0,
          best_set_weight: e.best_set_weight || 0,
          best_set_reps: e.best_set_reps || 0,
          is_personal_record: e.is_personal_record,
          is_world_record: e.is_world_record,
          personal_record_value: e.personal_record_value || 0,
          world_record_value: e.world_record_value || 0,
          record_metric_type: e.record_metric_type || 'estimated_1rm',
          avg_rating: e.rating,
          sets: exSets.map(s => ({
            set_number: s.set_number,
            weight: Number(s.weight) || 0,
            reps: s.reps || 0,
            duration_seconds: s.duration_seconds || 0,
            rest_seconds: s.rest_seconds || 0,
            volume: (Number(s.weight) || 0) * (s.reps || 0),
            completed_at: s.completed_at,
          })),
          computed: {
            set_count: exSets.length,
            rep_range: `${repsMin}-${repsMax}`,
            rep_drop_max_to_min: repsDrop,
            weight_range: bestW > 0
              ? `${Math.min(...weightsArr.filter(w => w > 0)).toFixed(1)}-${Math.max(...weightsArr).toFixed(1)}`
              : 'bodyweight',
            best_session_set: { weight: bestW, reps: bestR },
            best_session_e1rm: bestE1RM,
          },
        };
      }).filter(Boolean);

      // ── Volume by muscle group ─────────────────────────────────────────
      const volumeByMuscle = {};
      for (const e of exercises) {
        const exSets = sets.filter(s => s.exercise_id === e.exercise_id);
        const muscle = e.muscle_group || 'other';
        volumeByMuscle[muscle] = (volumeByMuscle[muscle] || 0)
          + exSets.reduce((sum, s) => sum + ((Number(s.weight) || 0) * (s.reps || 0)), 0);
      }

      // ── Recent history ─────────────────────────────────────────────────
      let recentRows = [];
      try {
        const r = await client.query(`
          SELECT total_volume, total_duration_seconds, total_rest_seconds,
                 completed_at, streak_at_completion, calories_burned
          FROM daily_workouts
          WHERE user_id = $1 AND status = 'completed' AND id != $2
          ORDER BY completed_at DESC LIMIT 5
        `, [userId, workoutId]);
        recentRows = r.rows;
      } catch (_) {}

      const avgVolumeLast5 = recentRows.length > 0
        ? Math.round(recentRows.reduce((a, r) => a + Number(r.total_volume || 0), 0) / recentRows.length)
        : null;

      // ── Build structured data block for AI ─────────────────────────────
      const dataBlock = buildDataBlock();

      function buildDataBlock() {
        const lines = [];

        lines.push('=====USER PROFILE=====');
        lines.push(`full_name: ${w.full_name || 'N/A'}`);
        lines.push(`age: ${w.age || 'N/A'}, gender: ${w.gender || 'N/A'}`);
        lines.push(`height: ${w.height || 'N/A'} cm, weight: ${w.user_weight || 'N/A'} kg`);
        lines.push(`fitness_goal: ${w.fitness_goal || 'General fitness'}`);
        lines.push(`experience_level: ${w.experience_level || 'Intermediate'}`);
        lines.push('');

        lines.push('=====WORKOUT RECORD=====');
        lines.push(`id: ${w.id}, title: ${w.title || 'Untitled'}, status: ${w.status}`);
        lines.push(`started_at: ${w.started_at}`);
        lines.push(`completed_at: ${w.completed_at || 'N/A'}`);
        lines.push(`total_duration: ${formatTime(w.total_duration_seconds || 0)} (${w.total_duration_seconds || 0}s)`);
        lines.push(`total_rest: ${formatTime(w.total_rest_seconds || 0)} (${w.total_rest_seconds || 0}s)`);
        lines.push(`total_volume: ${Math.round(totalVolume)} kg over ${totalSets} sets / ${totalReps} reps`);
        lines.push(`calories_burned: ${w.calories_burned || 0} kcal (method: ${w.calories_burned_method || 'N/A'})`);
        lines.push(`workout_met: ${w.workout_met || 'N/A'}`);
        lines.push(`streak_at_completion: ${w.streak_at_completion || 0}`);
        lines.push(`post_workout_weight: ${w.post_workout_weight || 'N/A'} kg`);
        lines.push(`water_intake: ${w.water_intake_liters || 0} L`);
        lines.push(`rating: ${w.rating || 'Not rated'}, notes: ${w.notes || 'None'}`);
        lines.push(`skipped_exercises: ${skippedCount}`);
        lines.push(`estimated_rest_per_set: ~${estimatedRestPerSet}s (derived from total_rest / (sets-1))`);
        if (avgVolumeLast5 !== null) {
          const volDelta = Math.round(((totalVolume - avgVolumeLast5) / avgVolumeLast5) * 100);
          const sign = volDelta >= 0 ? '+' : '';
          lines.push(`volume_vs_5_workout_avg: ${sign}${volDelta}% (this: ${Math.round(totalVolume)}kg vs avg: ${avgVolumeLast5}kg)`);
        }
        lines.push('');

        lines.push('=====VOLUME BY MUSCLE GROUP=====');
        for (const [muscle, vol] of Object.entries(volumeByMuscle).sort((a, b) => b[1] - a[1])) {
          const pct = totalVolume > 0 ? Math.round((vol / totalVolume) * 100) : 0;
          lines.push(`  ${muscle}: ${Math.round(vol)}kg (${pct}%)`);
        }
        lines.push('');

        lines.push('=====RECENT WORKOUT HISTORY=====');
        if (recentRows.length > 0) {
          recentRows.forEach((r, i) => {
            lines.push(`  Workout ${i + 1}: ${Math.round(r.total_volume || 0)}kg volume, ${Math.round((r.total_duration_seconds || 0) / 60)}min, rest ${Math.round((r.total_rest_seconds || 0) / 60)}min, streak: ${r.streak_at_completion || 0}, cals: ${r.calories_burned || 0}`);
          });
        } else {
          lines.push('  (no recent completed workouts)');
        }
        lines.push('');

        lines.push('=====EXERCISES=====');
        exerciseAnalytics.forEach((ea, idx) => {
          lines.push('');
          lines.push(`--- EXERCISE ${idx + 1}: ${ea.name} ---`);
          lines.push(`  exercise_id: ${ea.exercise_id}`);
          lines.push(`  target: ${ea.target}, category: ${ea.category}, equipment: ${ea.equipment}`);
          lines.push(`  muscle_group: ${ea.muscle_group}, body_part: ${ea.body_part}`);
          lines.push(`  program: ${ea.computed.set_count}/${ea.target_sets} sets, target_reps: ${ea.target_reps}, target_weight: ${ea.target_weight}, target_rest: ${ea.target_rest_time}`);
          lines.push(`  completed: ${ea.is_completed}, skipped: ${ea.is_skipped}`);
          lines.push(`  total_set_volume: ${ea.total_set_volume} kg`);
          lines.push(`  estimated_1rm (from DB sync): ${ea.estimated_1rm} kg`);
          lines.push(`  record_metric_type: ${ea.record_metric_type}, personal_record_value: ${ea.personal_record_value}, world_record_value: ${ea.world_record_value}`);
          lines.push(`  is_personal_record: ${ea.is_personal_record}, is_world_record: ${ea.is_world_record}`);
          lines.push(`  best_set_weight: ${ea.best_set_weight} kg, best_set_reps: ${ea.best_set_reps}`);
          lines.push(`  avg_rating: ${ea.avg_rating || 'N/A'}/10`);

          lines.push(`  [COMPUTED] set_consistency: reps ranged ${ea.computed.rep_range} (drop of ${ea.computed.rep_drop_max_to_min} from best to worst set)`);
          lines.push(`  [COMPUTED] weight_range_across_sets: ${ea.computed.weight_range}`);
          lines.push(`  [COMPUTED] best_session_set: ${ea.computed.best_session_set.weight}kg \u00d7 ${ea.computed.best_session_set.reps} reps (session e1RM: ${ea.computed.best_session_e1rm} kg)`);

          lines.push(`  SETS:`);
          ea.sets.forEach(s => {
            const timeStr = s.duration_seconds > 0 ? `${formatTime(s.duration_seconds)} effort` : 'instant';
            const restNote = estimatedRestPerSet > 0 ? `, ~${formatTime(estimatedRestPerSet)} rest after` : '';
            const weightStr = s.weight > 0 ? `${s.weight.toFixed(1)}kg \u00d7 ${s.reps} reps` : `${s.reps} reps (bodyweight)`;
            lines.push(`    Set ${s.set_number}: ${weightStr} (${timeStr}${restNote})`);
          });
        });

        return lines.join('\n');
      }

      // ═══════════════════════════════════════════════════════════════════
      // PASS 1 — Data Analysis (cheap model, structured JSON output)
      // ═══════════════════════════════════════════════════════════════════
      let analysisObservations = '';

      const analysisPrompt = `You are a workout data analyst. Given the raw workout data below, extract key observations in JSON format. Be specific, use exact numbers, and only reference what the data shows — never invent or guess.

${dataBlock}

Return ONLY a JSON object with this structure (no other text):
{
  "session_type": "push / pull / legs / full_body / upper / lower / mixed / cardio",
  "overall_effectiveness": "effective / average / subpar",
  "volume_assessment": "above_average / average / below_average vs their recent history",
  "key_observations": [
    "specific data-backed observation 1",
    "specific data-backed observation 2"
  ],
  "per_exercise_highlights": [
    {
      "exercise": "exercise name",
      "flag": "positive / concern / neutral",
      "detail": "what specifically stood out about this exercise"
    }
  ],
  "rest_and_pacing": "observation about rest patterns based on the data",
  "consistency_notes": "observation about set-to-set consistency across exercises",
  "priority_focus": "the single most important thing to address"
}`;

      try {
        analysisObservations = await callAI(analysisPrompt, null, 'groq');
      } catch (_) {
        // Fallback: generate a minimal analysis from computed stats
        const volNote = avgVolumeLast5 !== null
          ? `Volume is ${Math.round(((totalVolume - avgVolumeLast5) / avgVolumeLast5) * 100) >= 0 ? 'above' : 'below'} the 5-workout average.`
          : '';
        analysisObservations = JSON.stringify({
          session_type: 'mixed',
          overall_effectiveness: totalSets > 0 ? 'average' : 'subpar',
          volume_assessment: avgVolumeLast5 !== null
            ? (totalVolume >= avgVolumeLast5 ? 'above_average' : 'below_average')
            : 'average',
          key_observations: [
            `${totalSets} sets completed with ${totalReps} total reps and ${Math.round(totalVolume)}kg total volume. ${volNote}`,
            `${skippedCount > 0 ? skippedCount + ' exercises skipped.' : 'No exercises skipped.'}`
          ],
          per_exercise_highlights: exerciseAnalytics.map(ea => ({
            exercise: ea.name,
            flag: ea.is_personal_record ? 'positive' : 'neutral',
            detail: `${ea.computed.set_count}/${ea.target_sets} sets, best set: ${ea.computed.best_session_set.weight}kg \u00d7 ${ea.computed.best_session_set.reps} reps${ea.is_personal_record ? ' (NEW PR!)' : ''}${ea.is_world_record ? ' (WORLD RECORD!)' : ''}`
          })),
          rest_and_pacing: estimatedRestPerSet > 0
            ? `Estimated ~${estimatedRestPerSet}s rest between sets based on total rest / (sets-1).`
            : 'Rest data not available per set.',
          consistency_notes: 'See per-exercise set consistency in the data above.',
          priority_focus: 'Maintain consistency and progressive overload across all exercises.',
        });
      }

      // ═══════════════════════════════════════════════════════════════════
      // PASS 2 — Report Writing (capable model, 4-section output)
      // ═══════════════════════════════════════════════════════════════════
      const reportPrompt = `You are Coach Spotty, an elite personal trainer. Write a candid, data-driven analysis of this training session. Address the client as "you" throughout. Be specific, reference exact numbers, and sound like a real coach — not a motivational poster.

Below is the COMPLETE RAW DATA from the session, followed by an initial automated analysis.

${dataBlock}

=====INITIAL ANALYSIS (auto-generated)=====
${analysisObservations}

=====YOUR TASK=====
Write 4 sections separated by the exact markers shown below. Reference specific exercise names, weights, reps, and trends from the data. Be professional, direct, and helpful.

===SUMMARY===
Write 2-3 sentences: overall session assessment. Reference specific data — volume, duration, comparison to average, what type of session it was. Be honest about effectiveness.

===GOOD THINGS===
List 2-4 specific things that went well. Reference exact exercises, set progression, consistency, PRs, effort. Don't be generic. If the data shows nothing remarkable, say so honestly.

===AREAS TO IMPROVE===
List 2-4 specific issues based on actual data. Point out set-to-set dropoffs, skipped exercises, rest patterns, consistency problems. Be direct and reference exact numbers.

===RECOMMENDATIONS===
Give 2-4 actionable tips for the next session. Tie each to a specific observation from this workout's data. Include exercise substitutions, rest adjustments, or technique cues.

Keep it concise, direct, and professional — like a coach reviewing your training log in person.`;

      const aiRaw = await callAI(reportPrompt, null, 'openrouter/free');

      // ── Parse sections ──────────────────────────────────────────────────
      const extractSection = (text, marker) => {
        const regex = new RegExp(`${marker}\\s*([\\s\\S]*?)(?=\\n===|$)`);
        const match = text.match(regex);
        return match ? match[1].trim() : '';
      };

      const report = {
        summary: extractSection(aiRaw, '===SUMMARY==='),
        good_things: extractSection(aiRaw, '===GOOD THINGS==='),
        areas_to_improve: extractSection(aiRaw, '===AREAS TO IMPROVE==='),
        recommendations: extractSection(aiRaw, '===RECOMMENDATIONS==='),
      };

      await client.query(
        `UPDATE workout_reports SET summary = $1, good_things = $2, areas_to_improve = $3, recommendations = $4, status = 'completed'
         WHERE id = $5`,
        [report.summary, report.good_things, report.areas_to_improve, report.recommendations, reportId]
      );

      await client.query(
        `INSERT INTO notifications (user_id, type, reference_id, message)
         VALUES ($1, 'workout_report', $2, 'Your workout report is ready! Tap to view insights and recommendations.')`,
        [userId, reportId]
      );

      sendPush(userId, 'Workout Report Ready', 'Your workout report is ready! Tap to view insights and recommendations.', {
        type: 'workout_report',
        referenceId: reportId,
      });
    } catch (bgErr) {
      console.error('Background report generation failed:', bgErr);
      try {
        await client.query('DELETE FROM workout_reports WHERE id = $1', [reportId]);
      } catch (_) {
        console.error('Failed to cleanup report placeholder:', _);
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /daily/workouts/:id/generate-report error:', err);
    if (client) client.release();
    res.status(500).json({ error: err.message });
  }
});

// ── GET /daily/reports ── List user's workout reports ───────────────────────
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT wr.id, wr.daily_workout_id, wr.summary, wr.created_at, wr.status,
             dw.total_duration_seconds, dw.total_volume,
             TO_CHAR(dw.completed_at, 'Mon DD, YYYY') AS workout_date
      FROM workout_reports wr
      JOIN daily_workouts dw ON wr.daily_workout_id = dw.id
      WHERE wr.user_id = $1
      ORDER BY wr.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /daily/reports error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /daily/reports/pending-workouts ── Completed workouts without reports ─
router.get('/reports/pending-workouts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dw.id, dw.title, dw.total_duration_seconds, dw.total_volume,
             TO_CHAR(dw.completed_at, 'Mon DD, YYYY') AS workout_date,
             TO_CHAR(dw.completed_at, 'HH:MI AM') AS workout_time
      FROM daily_workouts dw
      WHERE dw.user_id = $1
        AND dw.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM workout_reports wr WHERE wr.daily_workout_id = dw.id
        )
      ORDER BY dw.completed_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /daily/reports/pending-workouts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /daily/reports/:id ── Get a specific report ─────────────────────────
router.delete('/reports/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const reportId = parseInt(req.params.id);
    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ error: 'Invalid report id' });
    }

    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM workout_reports WHERE id = $1 AND user_id = $2',
      [reportId, req.user.id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found' });
    }

    await client.query(
      'DELETE FROM notifications WHERE user_id = $1 AND type = $2 AND reference_id = $3',
      [req.user.id, 'workout_report', reportId]
    );
    await client.query(
      'DELETE FROM workout_reports WHERE id = $1 AND user_id = $2',
      [reportId, req.user.id]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {
      console.error('ROLLBACK failed:', _);
    }
    console.error('DELETE /daily/reports/:id error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/reports/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT wr.*,
             dw.total_duration_seconds, dw.total_volume, dw.total_rest_seconds,
             dw.calories_burned, TO_CHAR(dw.completed_at, 'Mon DD, YYYY HH:MI AM') AS workout_date,
             dw.title AS workout_title
      FROM workout_reports wr
      JOIN daily_workouts dw ON wr.daily_workout_id = dw.id
      WHERE wr.id = $1 AND wr.user_id = $2
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /daily/reports/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check if report exists for a specific workout
router.get('/workouts/:id/report', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, status FROM workout_reports WHERE daily_workout_id = $1 AND user_id = $2 LIMIT 1',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /daily/workouts/:id/report error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /daily/muscle-detail/:slug — progress detail for a specific muscle ─────
router.get('/muscle-detail/:slug', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { slug } = req.params;

  // Reverse map: body-highlighter slug → all exercise target/body_part/category values
  const slugToTargets = {
    'chest':       ['pectorals', 'serratus anterior', 'chest'],
    'upper-back':  ['upper back', 'lats', 'back', 'rhomboids', 'latissimus dorsi', 'upper-back'],
    'lower-back':  ['spine', 'lower back'],
    'deltoids':    ['delts', 'shoulders', 'rotator cuff', 'deltoids'],
    'biceps':      ['biceps', 'upper arms'],
    'triceps':     ['triceps'],
    'forearm':     ['forearms', 'lower arms', 'wrist extensors', 'wrist flexors', 'wrists', 'forearm'],
    'abs':         ['abs', 'waist', 'abdominals', 'core', 'hip flexors'],
    'obliques':    ['obliques'],
    'gluteal':     ['glutes', 'gluteal'],
    'quadriceps':  ['quads', 'upper legs', 'quadriceps'],
    'hamstring':   ['hamstrings', 'hamstring'],
    'calves':      ['calves', 'lower legs', 'soleus'],
    'trapezius':   ['traps', 'trapezius', 'levator scapulae'],
    'neck':        ['neck'],
    'adductors':   ['adductors'],
    'abductors':   ['abductors'],
    'ankles':      ['ankle stabilizers', 'ankles'],
    'hands':       ['hands'],
  };

  const targets = slugToTargets[slug];
  if (!targets) return res.status(404).json({ error: 'Unknown muscle slug' });

  try {
    // All workout dates + exercise counts for this muscle
    const detailRes = await pool.query(
      `SELECT DATE(dw.completed_at) AS workout_date,
              COUNT(*)::int                             AS count
       FROM daily_workout_exercises dwe
       JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
       JOIN exercises e       ON dwe.exercise_id      = e.id
       WHERE dw.user_id = $1
         AND dw.status  = 'completed'
         AND (
           LOWER(COALESCE(e.target,    '')) = ANY($2::text[])
           OR LOWER(COALESCE(e.body_part,'')) = ANY($2::text[])
           OR LOWER(COALESCE(e.category,  '')) = ANY($2::text[])
         )
       GROUP BY DATE(dw.completed_at)
       ORDER BY workout_date DESC`,
      [userId, targets]
    );

    const rows = detailRes.rows;
    const totalDays = rows.length;
    const lastWorkoutDate = rows[0]?.workout_date || null;
    const daysSinceLast = lastWorkoutDate
      ? Math.floor((Date.now() - new Date(lastWorkoutDate).getTime()) / 86_400_000)
      : null;

    // Compute current decay-weighted score (same algo as dashboard)
    const HALF_LIFE_DAYS = 45;
    const nowMs = Date.now();
    let currentScore = 0;
    rows.forEach(r => {
      const daysAgo = (nowMs - new Date(r.workout_date).getTime()) / 86_400_000;
      currentScore += r.count * Math.pow(2, -daysAgo / HALF_LIFE_DAYS);
    });

    const THRESHOLDS = Array.from({ length: 50 }, (_, idx) => {
      const i = idx + 1;
      return Math.round((0.5 + 0.1 * i + 0.118 * i * i) * 10) / 10;
    });
    const currentIntensity = THRESHOLDS.filter(t => currentScore >= t).length;

    // Monthly totals (last 12 months) for a bar-style chart
    const monthlyRes = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', dw.completed_at), 'YYYY-MM') AS month,
              COUNT(DISTINCT DATE(dw.completed_at))::int AS days
       FROM daily_workout_exercises dwe
       JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
       JOIN exercises e       ON dwe.exercise_id      = e.id
       WHERE dw.user_id = $1
         AND dw.status  = 'completed'
         AND (
           LOWER(COALESCE(e.target,    '')) = ANY($2::text[])
           OR LOWER(COALESCE(e.body_part,'')) = ANY($2::text[])
           OR LOWER(COALESCE(e.category,  '')) = ANY($2::text[])
         )
       GROUP BY DATE_TRUNC('month', dw.completed_at)
       ORDER BY month DESC
       LIMIT 12`,
      [userId, targets]
    );

    res.json({
      slug,
      totalDays,
      lastWorkoutDate: lastWorkoutDate ? new Date(lastWorkoutDate).toISOString().split('T')[0] : null,
      daysSinceLast,
      currentScore:     Math.round(currentScore * 10) / 10,
      currentIntensity,
      // Per-day history (newest first) — front-end uses this to build 84-day grid
      history: rows.map(r => ({
        date:  new Date(r.workout_date).toISOString().split('T')[0],
        count: r.count,
      })),
      monthlyStats: monthlyRes.rows,
    });
  } catch (err) {
    console.error('GET /daily/muscle-detail/:slug error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /daily/calendar-stats — overall + per-slug daily counts ────────────
router.get('/calendar-stats', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `calendar-stats:${userId}`;

  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    // ── 1. Overall: count of distinct workout days ────────────────────────────
    const overallRes = await pool.query(
      `SELECT DATE(dw.completed_at) AS date,
              COUNT(DISTINCT dw.id)::int                AS count
       FROM daily_workouts dw
       WHERE dw.user_id = $1
         AND dw.status  = 'completed'
       GROUP BY 1
       ORDER BY 1`,
      [userId]
    );

    // ── 2. Per-slug: all exercise data → resolve slug client-side ────────────
    const exerciseRes = await pool.query(
      `SELECT e.target, e.body_part, e.category,
              DATE(dw.completed_at) AS workout_date
       FROM daily_workout_exercises dwe
       JOIN daily_workouts dw ON dwe.daily_workout_id = dw.id
       JOIN exercises e       ON dwe.exercise_id      = e.id
       WHERE dw.user_id = $1
         AND dw.status  = 'completed'`,
      [userId]
    );

    // ── Exhaustive slug map (same as dashboard) ─────────────────────────────
    const toSlug = {
      'abductors':            'abductors',
      'abs':                  'abs',
      'adductors':            'adductors',
      'biceps':               'biceps',
      'calves':               'calves',
      'cardiovascular system': null,
      'delts':                'deltoids',
      'forearms':             'forearm',
      'glutes':               'gluteal',
      'hamstrings':           'hamstring',
      'lats':                 'upper-back',
      'levator scapulae':     'trapezius',
      'pectorals':            'chest',
      'quads':                'quadriceps',
      'serratus anterior':    'chest',
      'spine':                'lower-back',
      'traps':                'trapezius',
      'triceps':              'triceps',
      'upper back':           'upper-back',
      'back':                 'upper-back',
      'cardio':               null,
      'chest':                'chest',
      'lower arms':           'forearm',
      'lower legs':           'calves',
      'neck':                 'neck',
      'shoulders':            'deltoids',
      'upper arms':           'biceps',
      'upper legs':           'quadriceps',
      'waist':                'abs',
      'abdominals':           'abs',
      'ankle stabilizers':    'ankles',
      'ankles':               'ankles',
      'core':                 'abs',
      'deltoids':             'deltoids',
      'hands':                'hands',
      'hip flexors':          'abs',
      'latissimus dorsi':     'upper-back',
      'lower back':           'lower-back',
      'obliques':             'obliques',
      'quadriceps':           'quadriceps',
      'rhomboids':            'upper-back',
      'rotator cuff':         'deltoids',
      'soleus':               'calves',
      'trapezius':            'trapezius',
      'upper back':           'upper-back',
      'wrist extensors':      'forearm',
      'wrist flexors':        'forearm',
      'wrists':               'forearm',
    };

    const SLUG_LABELS = {
      chest:         'Chest',
      'upper-back':  'Upper Back',
      'lower-back':  'Lower Back',
      deltoids:      'Shoulders',
      biceps:        'Biceps',
      triceps:       'Triceps',
      forearm:       'Forearms',
      abs:           'Abs',
      obliques:      'Obliques',
      gluteal:       'Glutes',
      quadriceps:    'Quads',
      hamstring:     'Hamstrings',
      calves:        'Calves',
      trapezius:     'Traps',
      neck:          'Neck',
      adductors:     'Adductors',
      abductors:     'Abductors',
      ankles:        'Ankles',
      hands:         'Hands',
      tibialis:      'Tibialis',
      knees:         'Knees',
      feet:          'Feet',
    };

    // ── 1b. Rest days: dates when the user logged a rest day (with type) ──────
    const restRes = await pool.query(
      `SELECT DATE(dw.completed_at) AS date,
              COALESCE(dw.rest_type, 'fatigue') AS rest_type
       FROM daily_workouts dw
       WHERE dw.user_id = $1
         AND dw.status = 'rest'
       ORDER BY dw.completed_at`,
      [userId]
    );

    // ── Build per-slug date→count map ───────────────────────────────────────
    const slugMap = {}; // slug -> { date: count }
    for (const row of exerciseRes.rows) {
      const candidates = [row.target, row.body_part, row.category];
      let slug = null;
      for (const raw of candidates) {
        if (!raw) continue;
        const key = raw.trim().toLowerCase();
        const mapped = toSlug[key];
        if (mapped) { slug = mapped; break; }
      }
      if (!slug) continue;

      if (!slugMap[slug]) slugMap[slug] = {};
      const dateStr = new Date(row.workout_date).toISOString().split('T')[0];
      slugMap[slug][dateStr] = (slugMap[slug][dateStr] || 0) + 1;
    }

    // ── Format parts array (all body parts, trained or not) ─────────────────
    const parts = Object.entries(SLUG_LABELS)
      .map(([slug, label]) => ({
        slug,
        label,
        history: slugMap[slug]
          ? Object.entries(slugMap[slug])
              .map(([date, count]) => ({ date, count }))
              .sort((a, b) => a.date.localeCompare(b.date))
          : [],
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // ── Format overall ──────────────────────────────────────────────────────
    const overall = overallRes.rows.map(r => ({
      date: new Date(r.date).toISOString().split('T')[0],
      count: r.count,
    }));

    const restDays = restRes.rows.reduce((acc, r) => {
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      acc[dateStr] = r.rest_type;
      return acc;
    }, {});

    setCache(cacheKey, { overall, parts, restDays });
    res.json({ overall, parts, restDays });
  } catch (err) {
    console.error('GET /daily/calendar-stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /daily/workouts-by-date — workouts for a specific date ────────────
router.get('/workouts-by-date', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param required' });

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
         AND DATE(dw.completed_at) = $2::date
       ORDER BY dw.started_at DESC`,
      [userId, date]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /daily/workouts-by-date error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /daily/rest-day — log a typed rest day ───────────────────────────
router.post('/rest-day', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  // rest_type: 'fatigue' | 'sick' | 'injury' | 'after_workout' | 'late' | 'other'
  const { date, rest_type = 'fatigue' } = req.body;

  // Validate rest_type
  const validTypes = ['fatigue', 'sick', 'injury', 'after_workout', 'late', 'other'];
  const safeType = validTypes.includes(rest_type) ? rest_type : 'fatigue';

  try {
    const targetDate = date ? new Date(date) : new Date();
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Prevent duplicate rest-day entries on the same date
    const existing = await pool.query(
      `SELECT id FROM daily_workouts
       WHERE user_id = $1 AND DATE(completed_at) = $2::date AND status = 'rest'
       LIMIT 1`,
      [userId, targetDateStr]
    );

    let workout;
    let isUpdated = false;

    if (existing.rows.length > 0) {
      const updateRes = await pool.query(
        `UPDATE daily_workouts 
         SET rest_type = $1, title = $2 
         WHERE id = $3 
         RETURNING *`,
        [safeType, `Rest Day (${safeType})`, existing.rows[0].id]
      );
      workout = updateRes.rows[0];
      isUpdated = true;
    } else {
      const insertRes = await pool.query(
        `INSERT INTO daily_workouts (user_id, title, status, rest_type, started_at, completed_at)
         VALUES ($1, $2, 'rest', $3, $4, $4) RETURNING *`,
        [userId, `Rest Day (${safeType})`, safeType, targetDate]
      );
      workout = insertRes.rows[0];
    }

    // Streak logic:
    // Only 'fatigue' (Normal Fatigue Rest) preserves/bridges the streak.
    // All other rest types (sick, injury, after_workout, late, other) reset current_streak to 0.
    if (safeType === 'fatigue') {
      const userRes = await pool.query('SELECT last_workout_date FROM users WHERE id = $1', [userId]);
      const currentLastDate = userRes.rows[0]?.last_workout_date;

      if (!currentLastDate || new Date(targetDateStr) >= new Date(currentLastDate)) {
        await pool.query(
          `UPDATE users SET last_workout_date = $1 WHERE id = $2`,
          [targetDateStr, userId]
        );
      }
    } else {
      await pool.query(
        `UPDATE users SET current_streak = 0 WHERE id = $1`,
        [userId]
      );
    }

    res.status(isUpdated ? 200 : 201).json({ success: true, updated: isUpdated, workout });
  } catch (err) {
    console.error('POST /daily/rest-day error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

