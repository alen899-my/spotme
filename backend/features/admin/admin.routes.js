'use strict';

const express = require('express');
const router = express.Router();

const adminController = require('./admin.controller');
const authenticateAdmin = require('../../middleware/adminAuth');
const upload = require('../../utils/upload');
const { validate, schemas } = require('../../middleware/validate');

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/login', adminController.login);
router.get('/me', authenticateAdmin, adminController.getMe);
router.get('/dashboard', authenticateAdmin, adminController.getDashboard);

// ─── User CRUD ────────────────────────────────────────────────────────────────
router.get('/users', authenticateAdmin, adminController.listUsers);
router.get('/users/:id', authenticateAdmin, adminController.getUser);
router.put('/users/:id', authenticateAdmin, adminController.updateUser);
router.delete('/users/:id', authenticateAdmin, adminController.deleteUser);

// ─── Feedback CRUD ────────────────────────────────────────────────────────────
router.get('/feedback', authenticateAdmin, adminController.listFeedback);
router.delete('/feedback/:id', authenticateAdmin, adminController.deleteFeedback);

// ─── Active Users ─────────────────────────────────────────────────────────────
router.get('/active-users', authenticateAdmin, adminController.getActiveUsers);

// ─── Exercise CRUD ────────────────────────────────────────────────────────────
router.post(
  '/exercises',
  authenticateAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gif', maxCount: 1 },
  ]),
  validate(schemas.createExercise),
  adminController.createExercise
);

router.put(
  '/exercises/:id',
  authenticateAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gif', maxCount: 1 },
  ]),
  adminController.updateExercise
);

// ─── Workout Split CRUD (admin templates) ────────────────────────────────────
router.get('/splits', authenticateAdmin, adminController.listSplits);
router.get('/splits/:id', authenticateAdmin, adminController.getSplit);
router.post('/splits', authenticateAdmin, adminController.createSplit);
router.put('/splits/:id', authenticateAdmin, adminController.updateSplit);
router.delete('/splits/:id', authenticateAdmin, adminController.deleteSplit);

// ─── Entity Library CRUD ──────────────────────────────────────────────────────
const entityNameMap = {
  categories: 'categories',
  body_parts: 'body-parts',
  equipment: 'equipment',
  targets: 'targets',
  muscle_groups: 'muscle-groups',
  secondary_muscles: 'secondary-muscles',
};

for (const [table, entityName] of Object.entries(entityNameMap)) {
  router.get(`/${entityName}`, authenticateAdmin, adminController.makeListEntityHandler(table, entityName));
  router.get(`/${entityName}/:id`, authenticateAdmin, adminController.makeGetEntityHandler(table, entityName));
  router.post(`/${entityName}`, authenticateAdmin, upload.single('image'), adminController.makeCreateEntityHandler(table, entityName));
  router.put(`/${entityName}/:id`, authenticateAdmin, upload.single('image'), adminController.makeUpdateEntityHandler(table, entityName));
  router.delete(`/${entityName}/:id`, authenticateAdmin, adminController.makeDeleteEntityHandler(table, entityName));
}

// ─── App Builds ───────────────────────────────────────────────────────────────
router.get('/builds', authenticateAdmin, adminController.listBuilds);
router.get('/builds/:id', authenticateAdmin, adminController.getBuild);
router.post('/builds/presigned-url', authenticateAdmin, adminController.getBuildPresignedUrl);
router.post('/builds', authenticateAdmin, upload.single('build_file'), adminController.createBuild);
router.put('/builds/:id', authenticateAdmin, upload.single('build_file'), adminController.updateBuild);
router.delete('/builds/:id', authenticateAdmin, adminController.deleteBuild);

// ─── Nutrition & Food Database ────────────────────────────────────────────────
router.get('/nutrition/foods', authenticateAdmin, adminController.listFoods);
router.post('/nutrition/foods', authenticateAdmin, adminController.createFood);
router.delete('/nutrition/foods/:id', authenticateAdmin, adminController.deleteFood);
router.get('/nutrition/meals', authenticateAdmin, adminController.listMeals);

// ─── Physique Moderation ──────────────────────────────────────────────────────
router.get('/physique', authenticateAdmin, adminController.listPhysique);
router.put('/physique/:id/status', authenticateAdmin, adminController.updatePhysiqueStatus);
router.delete('/physique/:id', authenticateAdmin, adminController.deletePhysique);

// ─── Push Notifications ───────────────────────────────────────────────────────
router.post('/notifications/broadcast', authenticateAdmin, adminController.broadcastPush);
router.get('/notifications/campaigns', authenticateAdmin, adminController.listCampaigns);

// ─── Workouts Activity ────────────────────────────────────────────────────────
router.get('/workouts/sessions', authenticateAdmin, adminController.listWorkouts);
router.get('/workouts/analytics', authenticateAdmin, adminController.getWorkoutAnalytics);
router.get('/workouts/athlete-exercises', authenticateAdmin, adminController.getAthleteExercises);
router.get('/workouts/exercise-progression', authenticateAdmin, adminController.getAthleteExerciseProgression);

// ─── Phase 2: Onboarding, Habits & User 360 ───────────────────────────────────
router.get('/onboarding/analytics', authenticateAdmin, adminController.getOnboarding);
router.get('/habits/analytics', authenticateAdmin, adminController.getHabits);
router.get('/users/:id/full-profile', authenticateAdmin, adminController.getUser360);

// ─── Phase 3: AI Intelligence, Remote Config & Gamification ───────────────────
router.get('/ai/analytics', authenticateAdmin, adminController.getAiAnalytics);
router.get('/ai/sessions/:id', authenticateAdmin, adminController.getAiSessionDetails);
router.get('/remote-config', authenticateAdmin, adminController.getRemoteConfig);
router.put('/remote-config', authenticateAdmin, adminController.updateRemoteConfig);
router.get('/gamification/analytics', authenticateAdmin, adminController.getGamification);

module.exports = router;
