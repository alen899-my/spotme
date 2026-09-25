const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const workoutsController = require('./workouts.controller');

// SHARED SPLITS
router.get('/shared-splits', authenticateToken, workoutsController.getSharedSplits);
router.get('/shared-splits/:id', authenticateToken, workoutsController.getSharedSplitDetail);
router.post('/shared-splits/:id/clone', authenticateToken, workoutsController.cloneSharedSplit);

// MAIN SPLITS
router.get('/splits', authenticateToken, workoutsController.getUserSplits);
router.get('/splits/:id', authenticateToken, workoutsController.getSplitDetail);

// AI SPLIT BUILDER
router.post('/splits/ai-generate', authenticateToken, workoutsController.generateAiSplit);
router.post('/splits/ai-refine', authenticateToken, workoutsController.refineAiSplit);
router.post('/splits/save-ai-split', authenticateToken, workoutsController.saveAiSplit);

// SPLIT CRUD
router.post('/splits', authenticateToken, workoutsController.createSplit);
router.put('/splits/:id', authenticateToken, workoutsController.updateSplit);
router.delete('/splits/:id', authenticateToken, workoutsController.deleteSplit);

// SPLIT RATINGS
router.post('/splits/:id/rate', authenticateToken, workoutsController.rateSplit);

// SESSIONS (DAYS WITHIN SPLIT)
router.get('/splits/:id/sessions', authenticateToken, workoutsController.getSessionsForSplit);
router.post('/splits/:id/sessions', authenticateToken, workoutsController.createSession);
router.put('/sessions/:id', authenticateToken, workoutsController.updateSession);
router.get('/sessions/:id', authenticateToken, workoutsController.getSessionDetail);
router.delete('/sessions/:id', authenticateToken, workoutsController.deleteSession);

// EXERCISES (WITHIN A SESSION)
router.get('/sessions/:id/exercises', authenticateToken, workoutsController.getSessionExercises);
router.post('/sessions/:id/exercises', authenticateToken, workoutsController.addExerciseToSession);
router.delete('/exercises/:id', authenticateToken, workoutsController.deleteExerciseFromSession);
router.put('/exercises/:id', authenticateToken, workoutsController.updateExerciseInSession);
router.post('/exercises/:id/move', authenticateToken, workoutsController.moveExerciseToSession);

// SESSION DUPLICATE + SPLIT LAYOUT
router.post('/sessions/:id/duplicate', authenticateToken, workoutsController.duplicateSession);
router.put('/splits/:id/layout', authenticateToken, workoutsController.updateSplitLayout);

// GLOBAL EXERCISES BROWSER
router.get('/exercises/categories', authenticateToken, workoutsController.getUniqueExerciseCategories);
router.get('/exercises/by-category/:category', authenticateToken, workoutsController.getExercisesByCategory);
router.get('/exercises/search', authenticateToken, workoutsController.searchExercises);

module.exports = router;
