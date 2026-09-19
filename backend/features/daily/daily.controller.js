'use strict';

const dailyService = require('./daily.service');

// ── GET /daily/workouts ───────────────────────────────────────────────────────
async function listWorkouts(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await dailyService.listWorkouts({ userId: req.user.id, page, limit });
    res.json(result);
  } catch (err) {
    console.error('GET /daily/workouts error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── POST /daily/workouts ──────────────────────────────────────────────────────
async function startWorkout(req, res) {
  try {
    const { title, split_id, session_id } = req.body;
    const workout = await dailyService.startWorkout({
      userId: req.user.id,
      title,
      split_id,
      session_id,
    });
    res.status(201).json(workout);
  } catch (err) {
    console.error('POST /daily/workouts error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /daily/workouts/:id ───────────────────────────────────────────────────
async function getWorkout(req, res) {
  try {
    const { shared } = req.query;
    const workout = await dailyService.getWorkoutById({
      workoutId: req.params.id,
      userId: req.user.id,
      shared,
    });
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json(workout);
  } catch (err) {
    console.error('GET /daily/workouts/:id error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── POST /daily/workouts/:id/exercises ────────────────────────────────────────
async function addExercise(req, res) {
  try {
    const { exercise_id, target_sets, target_reps, target_weight, target_rest_time } = req.body;
    const result = await dailyService.addExerciseToWorkout({
      workoutId: req.params.id,
      userId: req.user.id,
      exercise_id,
      target_sets,
      target_reps,
      target_weight,
      target_rest_time,
    });
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.status(201).json(result.exercise);
  } catch (err) {
    console.error('POST /daily/workouts/:id/exercises error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── POST /daily/exercises/:id/sets ────────────────────────────────────────────
async function logSet(req, res) {
  try {
    const {
      set_number, weight, reps, duration_seconds, rest_seconds,
      workout_duration, total_rest_duration, is_skipped
    } = req.body;

    const set = await dailyService.logSet({
      exerciseId: req.params.id,
      set_number,
      weight,
      reps,
      duration_seconds,
      rest_seconds,
      workout_duration,
      total_rest_duration,
      is_skipped,
    });
    res.status(201).json(set);
  } catch (err) {
    console.error('POST /daily/exercises/:id/sets error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── PATCH /daily/exercises/:id/skip ───────────────────────────────────────────
async function skipExercise(req, res) {
  try {
    const result = await dailyService.skipExercise({ exerciseId: req.params.id });
    if (!result) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('PATCH /daily/exercises/:id/skip error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── PATCH /daily/exercises/:id/complete ───────────────────────────────────────
async function completeExercise(req, res) {
  try {
    const result = await dailyService.completeExercise({ exerciseId: req.params.id });
    if (!result) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('PATCH /daily/exercises/:id/complete error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── PATCH /daily/workouts/:id/complete ─────────────────────────────────────────
async function finishWorkout(req, res) {
  try {
    const workoutId = parseInt(req.params.id);
    const userId = req.user.id;
    const result = await dailyService.finishWorkout({
      workoutId,
      userId,
      body: req.body,
    });

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error, details: result.details });
    }

    res.json(result.workout);
  } catch (err) {
    console.error('[Daily] PATCH /complete error:', err);
    res.status(500).json({ error: 'Database update failed', details: err.message });
  }
}

// ── DELETE /daily/workouts/:id ────────────────────────────────────────────────
async function deleteWorkout(req, res) {
  try {
    const result = await dailyService.deleteWorkout({
      workoutId: req.params.id,
      userId: req.user.id,
    });
    if (!result) {
      return res.status(404).json({ error: 'Workout not found or unauthorized' });
    }
    res.json(result);
  } catch (err) {
    console.error('DELETE /daily/workouts/:id error:', err);
    res.status(500).json({ error: 'Database deletion failed', details: err.message });
  }
}

// ── PATCH /daily/workouts/:id/metrics ─────────────────────────────────────────
async function updateMetrics(req, res) {
  try {
    const { water_intake_liters, post_workout_weight, total_duration_seconds, total_rest_seconds } = req.body;
    const result = await dailyService.updateMetrics({
      workoutId: req.params.id,
      userId: req.user.id,
      water_intake_liters,
      post_workout_weight,
      total_duration_seconds,
      total_rest_seconds,
    });
    if (!result) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('PATCH /daily/workouts/:id/metrics error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── PATCH /daily/workouts/:id/recalculate ─────────────────────────────────────
async function recalculateWorkout(req, res) {
  try {
    const result = await dailyService.recalculateWorkout({
      workoutId: parseInt(req.params.id),
      userId: req.user.id,
    });
    if (!result) {
      return res.status(404).json({ error: 'Workout not found or unauthorized' });
    }
    res.json(result);
  } catch (err) {
    console.error('PATCH /daily/workouts/:id/recalculate error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── POST /daily/workouts/:id/photos ───────────────────────────────────────────
async function addPhotos(req, res) {
  try {
    const result = await dailyService.addPhotos({
      workoutId: req.params.id,
      userId: req.user.id,
      files: req.files,
    });
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('[Daily] POST /daily/workouts/:id/photos error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── DELETE /daily/photos/:id ──────────────────────────────────────────────────
async function deletePhoto(req, res) {
  try {
    const result = await dailyService.deletePhoto({ photoId: req.params.id });
    res.json(result);
  } catch (err) {
    console.error('DELETE /daily/photos/:id error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── DELETE /daily/exercises/:id ───────────────────────────────────────────────
async function deleteExercise(req, res) {
  try {
    const result = await dailyService.deleteExercise({
      exerciseId: req.params.id,
      userId: req.user.id,
    });
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('DELETE /daily/exercises/:id error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── DELETE /daily/sets/:id ────────────────────────────────────────────────────
async function deleteSet(req, res) {
  try {
    const result = await dailyService.deleteSet({
      setId: req.params.id,
      userId: req.user.id,
    });
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('DELETE /daily/sets/:id error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── PATCH /daily/sets/:id ─────────────────────────────────────────────────────
async function updateSet(req, res) {
  try {
    const { weight, reps, duration_seconds, rest_seconds } = req.body;
    const result = await dailyService.updateSet({
      setId: req.params.id,
      userId: req.user.id,
      weight,
      reps,
      duration_seconds,
      rest_seconds,
    });
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result.set);
  } catch (err) {
    console.error('PATCH /daily/sets/:id error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── PATCH /daily/exercises/:id/rating ─────────────────────────────────────────
async function rateExercise(req, res) {
  const { rating } = req.body;
  if (rating === undefined || rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 10' });
  }

  try {
    const updated = await dailyService.rateExercise({
      exerciseId: req.params.id,
      userId: req.user.id,
      rating,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Workout exercise not found or unauthorized' });
    }
    res.json(updated);
  } catch (err) {
    console.error('PATCH /daily/exercises/:id/rating error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── PATCH /daily/workouts/:id/rating ──────────────────────────────────────────
async function rateWorkout(req, res) {
  const { rating } = req.body;
  if (rating === undefined || rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 10' });
  }

  try {
    const updated = await dailyService.rateWorkout({
      workoutId: req.params.id,
      userId: req.user.id,
      rating,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Workout not found or unauthorized' });
    }
    res.json(updated);
  } catch (err) {
    console.error('PATCH /daily/workouts/:id/rating error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /daily/recommendations ────────────────────────────────────────────────
async function getRecommendations(req, res) {
  try {
    const recommendations = await dailyService.getRecommendations({ userId: req.user.id });
    res.json(recommendations);
  } catch (err) {
    console.error('GET /daily/recommendations error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /daily/dashboard ──────────────────────────────────────────────────────
async function getDashboard(req, res) {
  const userId = req.user.id;
  const cacheKey = `dashboard:${userId}`;
  const cachedDashboard = dailyService.getCached(cacheKey);
  if (cachedDashboard) return res.json(cachedDashboard);

  try {
    const responseData = await dailyService.buildDashboardData(userId);
    dailyService.setCache(cacheKey, responseData);
    res.json(responseData);
  } catch (err) {
    console.error('GET /daily/dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── POST /daily/workouts/:id/generate-report ───────────────────────────────────
async function generateReport(req, res) {
  try {
    const workoutId = parseInt(req.params.id);
    const userId = req.user.id;
    const forceRetry = Boolean(req.body?.force);

    const result = await dailyService.generateReport({ workoutId, userId, forceRetry });
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    console.error('POST /daily/workouts/:id/generate-report error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
}

// ── POST /daily/workouts/:id/chat ─────────────────────────────────────────────
async function chat(req, res) {
  try {
    const workoutId = parseInt(req.params.id);
    const userId = req.user.id;
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const reply = await dailyService.chatWithCoach({ workoutId, userId, message, history });
    if (!reply) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json({ reply });
  } catch (err) {
    console.error('POST /daily/workouts/:id/chat error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /daily/reports ────────────────────────────────────────────────────────
async function listReports(req, res) {
  try {
    const reports = await dailyService.listReports({ userId: req.user.id });
    res.json(reports);
  } catch (err) {
    console.error('GET /daily/reports error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /daily/reports/pending-workouts ───────────────────────────────────────
async function listPendingWorkouts(req, res) {
  try {
    const pending = await dailyService.listPendingWorkouts({ userId: req.user.id });
    res.json(pending);
  } catch (err) {
    console.error('GET /daily/reports/pending-workouts error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── DELETE /daily/reports/:id ─────────────────────────────────────────────────
async function deleteReport(req, res) {
  try {
    const reportId = parseInt(req.params.id);
    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ error: 'Invalid report id' });
    }

    const result = await dailyService.deleteReport({ reportId, userId: req.user.id });
    if (!result) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('DELETE /daily/reports/:id error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /daily/reports/:id ────────────────────────────────────────────────────
async function getReport(req, res) {
  try {
    const report = await dailyService.getReportById({ reportId: req.params.id, userId: req.user.id });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (err) {
    console.error('GET /daily/reports/:id error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /daily/workouts/:id/report ────────────────────────────────────────────
async function getWorkoutReport(req, res) {
  try {
    const report = await dailyService.getWorkoutReport({ workoutId: req.params.id, userId: req.user.id });
    res.json(report);
  } catch (err) {
    console.error('GET /daily/workouts/:id/report error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /daily/muscle-detail/:slug ────────────────────────────────────────────
async function getMuscleDetail(req, res) {
  try {
    const detail = await dailyService.getMuscleDetail({ userId: req.user.id, slug: req.params.slug });
    if (!detail) {
      return res.status(404).json({ error: 'Unknown muscle slug' });
    }
    res.json(detail);
  } catch (err) {
    console.error('GET /daily/muscle-detail/:slug error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /daily/calendar-stats ─────────────────────────────────────────────────
async function getCalendarStats(req, res) {
  try {
    const stats = await dailyService.getCalendarStats({ userId: req.user.id });
    res.json(stats);
  } catch (err) {
    console.error('GET /daily/calendar-stats error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /daily/workouts-by-date ───────────────────────────────────────────────
async function getWorkoutsByDate(req, res) {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param required' });

  try {
    const workouts = await dailyService.getWorkoutsByDate({ userId: req.user.id, date });
    res.json(workouts);
  } catch (err) {
    console.error('GET /daily/workouts-by-date error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── POST /daily/rest-day ──────────────────────────────────────────────────────
async function logRestDay(req, res) {
  try {
    const { date, rest_type } = req.body;
    const { updated, workout } = await dailyService.logRestDay({
      userId: req.user.id,
      date,
      rest_type,
    });
    res.status(updated ? 200 : 201).json({ success: true, updated, workout });
  } catch (err) {
    console.error('POST /daily/rest-day error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listWorkouts,
  startWorkout,
  getWorkout,
  addExercise,
  logSet,
  skipExercise,
  completeExercise,
  finishWorkout,
  deleteWorkout,
  updateMetrics,
  recalculateWorkout,
  addPhotos,
  deletePhoto,
  deleteExercise,
  deleteSet,
  updateSet,
  rateExercise,
  rateWorkout,
  getRecommendations,
  getDashboard,
  generateReport,
  chat,
  listReports,
  listPendingWorkouts,
  deleteReport,
  getReport,
  getWorkoutReport,
  getMuscleDetail,
  getCalendarStats,
  getWorkoutsByDate,
  logRestDay,
};
