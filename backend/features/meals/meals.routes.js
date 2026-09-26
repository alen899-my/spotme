const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validate');
const upload = require('../../utils/upload');
const mealsController = require('./meals.controller');

// Analyze meal image with AI
router.post('/analyze', authenticateToken, upload.single('photo'), mealsController.analyzeMeal);

// Save meal
router.post('/', authenticateToken, validate(schemas.meal), mealsController.saveMeal);

// Update meal
router.put('/:id', authenticateToken, validate(schemas.meal), mealsController.updateMeal);

// List user meals
router.get('/', authenticateToken, mealsController.getMeals);

// Personal analytics (same charts as admin, own user only)
router.get('/analytics', authenticateToken, mealsController.getMyAnalytics);
router.get('/recent-logs', authenticateToken, mealsController.getMyRecentMeals);

// Meal recommendations
router.get('/recommendation', authenticateToken, mealsController.getRecommendation);
router.post('/recommendation', authenticateToken, mealsController.saveRecommendation);
router.put('/recommendation/meals', authenticateToken, mealsController.updateRecommendedMeals);

// Food database search & browse
router.get('/food-search', authenticateToken, mealsController.searchFood);
router.get('/food-alternatives', authenticateToken, mealsController.getFoodAlternatives);
router.get('/food-browse', authenticateToken, mealsController.browseFood);

// Delete meal
router.delete('/:id', authenticateToken, mealsController.deleteMeal);

module.exports = router;
