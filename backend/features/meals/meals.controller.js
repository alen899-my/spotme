const mealsService = require('./meals.service');

/**
 * Controller to analyze meal image using AI.
 */
async function analyzeMeal(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const { description } = req.body;

    const data = await mealsService.analyzeMealPhoto(req.file.key, description);
    return res.json(data);
  } catch (err) {
    console.error('Meal analysis error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to save meal.
 */
async function saveMeal(req, res) {
  try {
    const data = await mealsService.saveMeal(req.user.id, req.body);
    return res.status(201).json(data);
  } catch (err) {
    console.error('Error saving meal:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to update meal.
 */
async function updateMeal(req, res) {
  try {
    const data = await mealsService.updateMeal(req.user.id, parseInt(req.params.id), req.body);
    if (!data) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    return res.json(data);
  } catch (err) {
    console.error('Error updating meal:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get user meals list.
 */
async function getMeals(req, res) {
  try {
    const { page, limit, date } = req.query;
    const data = await mealsService.getUserMeals(req.user.id, { page, limit, date });
    return res.json(data);
  } catch (err) {
    console.error('Error fetching meals:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get meal recommendations.
 */
async function getRecommendation(req, res) {
  try {
    const data = await mealsService.getMealRecommendations(req.user.id);
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(data);
  } catch (err) {
    console.error('Error generating recommendations:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to save recommendation settings and recalculate.
 */
async function saveRecommendation(req, res) {
  try {
    const data = await mealsService.saveRecommendationSettings(req.user.id, req.body);
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(data);
  } catch (err) {
    console.error('Error saving recommendation settings:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to search food database.
 */
async function searchFood(req, res) {
  try {
    const { q, meal_type, limit, offset } = req.query;
    const data = await mealsService.searchFoodDatabase({ q, meal_type, limit, offset });
    return res.json(data);
  } catch (err) {
    console.error('Food search error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to update recommended meals list in cache.
 */
async function updateRecommendedMeals(req, res) {
  try {
    const { recommendedMeals } = req.body;
    if (!recommendedMeals || !Array.isArray(recommendedMeals)) {
      return res.status(400).json({ error: 'recommendedMeals array is required' });
    }

    const updated = await mealsService.updateRecommendedMealsList(req.user.id, recommendedMeals);
    if (!updated) {
      return res.status(404).json({ error: 'No cached meal recommendations found for this user.' });
    }
    return res.json({ success: true, recommendedMeals: updated });
  } catch (err) {
    console.error('Error updating recommended meals:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to delete meal.
 */
async function deleteMeal(req, res) {
  try {
    const deleted = await mealsService.deleteMeal(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Meal not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting meal:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to find food alternatives by macros.
 */
async function getFoodAlternatives(req, res) {
  try {
    const { p, c, f, exclude_name, limit } = req.query;
    const data = await mealsService.getFoodAlternatives({ p, c, f, exclude_name, limit });
    return res.json(data);
  } catch (err) {
    console.error('Food alternatives error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get own nutrition analytics (same data as admin, scoped).
 */
async function getMyAnalytics(req, res) {
  try {
    const nutritionAnalyticsService = require('../admin/admin-nutrition-analytics.service');
    const { range, tz } = req.query;
    const data = await nutritionAnalyticsService.getNutritionAnalytics({
      userId: req.user.id,
      range,
      tz,
    });
    return res.json(data);
  } catch (err) {
    console.error('My nutrition analytics error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get own recent logged meals (same shape as admin grid).
 */
async function getMyRecentMeals(req, res) {
  try {
    const nutritionAnalyticsService = require('../admin/admin-nutrition-analytics.service');
    const { page, limit } = req.query;
    const data = await nutritionAnalyticsService.getRecentLoggedMeals({
      userId: req.user.id,
      page,
      limit,
    });
    return res.json(data);
  } catch (err) {
    console.error('My recent meals error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to browse food database with range filters and dynamic sorting.
 */
async function browseFood(req, res) {
  try {
    const data = await mealsService.browseFoodDatabase(req.query);
    return res.json(data);
  } catch (err) {
    console.error('Food browse error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  analyzeMeal,
  saveMeal,
  updateMeal,
  getMeals,
  getRecommendation,
  saveRecommendation,
  searchFood,
  updateRecommendedMeals,
  deleteMeal,
  getFoodAlternatives,
  browseFood,
  getMyAnalytics,
  getMyRecentMeals,
};
