'use strict';

const express = require('express');
const router = express.Router();

const dailyController = require('./daily.controller');
const authenticateToken = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validate');
const upload = require('../../utils/upload');

// ── Workouts ──────────────────────────────────────────────────────────────────
router.get('/workouts', authenticateToken, dailyController.listWorkouts);
router.post('/workouts', authenticateToken, validate(schemas.startWorkout), dailyController.startWorkout);
router.get('/workouts/:id', authenticateToken, dailyController.getWorkout);
router.delete('/workouts/:id', authenticateToken, dailyController.deleteWorkout);

// ── Workout Actions & Metrics ─────────────────────────────────────────────────
router.patch('/workouts/:id/complete', authenticateToken, validate(schemas.completeWorkout), dailyController.finishWorkout);
router.patch('/workouts/:id/metrics', authenticateToken, dailyController.updateMetrics);
router.patch('/workouts/:id/recalculate', authenticateToken, dailyController.recalculateWorkout);
router.patch('/workouts/:id/rating', authenticateToken, dailyController.rateWorkout);

// ── Exercises in Workouts ─────────────────────────────────────────────────────
router.post('/workouts/:id/exercises', authenticateToken, validate(schemas.addExercise), dailyController.addExercise);
router.delete('/exercises/:id', authenticateToken, dailyController.deleteExercise);
router.patch('/exercises/:id/skip', authenticateToken, dailyController.skipExercise);
router.patch('/exercises/:id/complete', authenticateToken, dailyController.completeExercise);
router.patch('/exercises/:id/rating', authenticateToken, dailyController.rateExercise);

// ── Sets ──────────────────────────────────────────────────────────────────────
router.post('/exercises/:id/sets', authenticateToken, validate(schemas.logSet), dailyController.logSet);
router.patch('/sets/:id', authenticateToken, dailyController.updateSet);
router.delete('/sets/:id', authenticateToken, dailyController.deleteSet);

// ── Workout Photos ────────────────────────────────────────────────────────────
router.post('/workouts/:id/photos', authenticateToken, upload.array('photos', 10), dailyController.addPhotos);
router.delete('/photos/:id', authenticateToken, dailyController.deletePhoto);

// ── Dashboard & Recommendations ───────────────────────────────────────────────
router.get('/dashboard', authenticateToken, dailyController.getDashboard);
router.get('/recommendations', authenticateToken, dailyController.getRecommendations);

// ── AI Reports & Coach Chat ───────────────────────────────────────────────────
router.post('/workouts/:id/generate-report', authenticateToken, dailyController.generateReport);
router.post('/workouts/:id/chat', authenticateToken, dailyController.chat);
router.get('/reports', authenticateToken, dailyController.listReports);
router.get('/reports/pending-workouts', authenticateToken, dailyController.listPendingWorkouts);
router.delete('/reports/:id', authenticateToken, dailyController.deleteReport);
router.get('/reports/:id', authenticateToken, dailyController.getReport);
router.get('/workouts/:id/report', authenticateToken, dailyController.getWorkoutReport);

// ── Muscle Progress & Calendar ────────────────────────────────────────────────
router.get('/muscle-detail/:slug', authenticateToken, dailyController.getMuscleDetail);
router.get('/calendar-stats', authenticateToken, dailyController.getCalendarStats);
router.get('/workouts-by-date', authenticateToken, dailyController.getWorkoutsByDate);

// ── Rest Days ─────────────────────────────────────────────────────────────────
router.post('/rest-day', authenticateToken, dailyController.logRestDay);

module.exports = router;
