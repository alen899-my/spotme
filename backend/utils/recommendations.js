const fs = require('fs');
const path = require('path');

// Cache to hold parsed recommendations from GYM.csv
let csvRecommendationsCache = null;

// Fallback lookup table directly derived from GYM.csv unique combinations
const fallbackRecommendations = {
  "female|muscle_gain|normal weight": {
    schedule: "Moderate cardio, Strength training, and 5000 steps walking",
    mealPlan: "Balanced diet with moderate protein and carbohydrates: Chicken breast, brown rice, spinach, eggs, apple"
  },
  "male|fat_burn|underweight": {
    schedule: "Light weightlifting, Yoga, and 2000 steps walking",
    mealPlan: "High-calorie, protein-rich diet: Whole milk, peanut butter, eggs, salmon, sweet potatoes"
  },
  "male|muscle_gain|normal weight": {
    schedule: "Moderate cardio, Strength training, and 5000 steps walking",
    mealPlan: "Balanced diet with moderate protein and carbohydrates: Chicken breast, brown rice, spinach, eggs, apple"
  },
  "male|muscle_gain|overweight": {
    schedule: "High-intensity interval training (HIIT), Cardio, and 8000 steps walking",
    mealPlan: "Low-carb, high-fiber diet: Avocado, grilled fish, broccoli, almonds, leafy greens"
  },
  "male|muscle_gain|underweight": {
    schedule: "Light weightlifting, Yoga, and 2000 steps walking",
    mealPlan: "High-calorie, protein-rich diet: Whole milk, peanut butter, eggs, salmon, sweet potatoes"
  },
  "female|fat_burn|overweight": {
    schedule: "High-intensity interval training (HIIT), Cardio, and 8000 steps walking",
    mealPlan: "Low-carb, high-fiber diet: Avocado, grilled fish, broccoli, almonds, leafy greens"
  },
  "female|fat_burn|obesity": {
    schedule: "Low-impact cardio, Swimming, and 10000 steps walking",
    mealPlan: "Low-calorie, nutrient-dense diet with portion control: carrot sticks,grilled chicken breast,steamed broccoli, Greek yogurt, mixed nuts, baked salmon, leafy greens, roasted sweet potatoes"
  },
  "female|muscle_gain|underweight": {
    schedule: "Light weightlifting, Yoga, and 2000 steps walking",
    mealPlan: "High-calorie, protein-rich diet: Whole milk, peanut butter, eggs, salmon, sweet potatoes"
  },
  "female|muscle_gain|overweight": {
    schedule: "High-intensity interval training (HIIT), Cardio, and 8000 steps walking",
    mealPlan: "Low-carb, high-fiber diet: Avocado, grilled fish, broccoli, almonds, leafy greens"
  },
  "female|fat_burn|underweight": {
    schedule: "Light weightlifting, Yoga, and 2000 steps walking",
    mealPlan: "High-calorie, protein-rich diet: Whole milk, peanut butter, eggs, salmon, sweet potatoes"
  },
  "female|muscle_gain|obesity": {
    schedule: "Low-impact cardio, Swimming, and 10000 steps walking",
    mealPlan: "Low-calorie, nutrient-dense diet with portion control: carrot sticks,grilled chicken breast,steamed broccoli, Greek yogurt, mixed nuts, baked salmon, leafy greens, roasted sweet potatoes"
  },
  "female|fat_burn|normal weight": {
    schedule: "Moderate cardio, Strength training, and 5000 steps walking",
    mealPlan: "Balanced diet with moderate protein and carbohydrates: Chicken breast, brown rice, spinach, eggs, apple"
  },
  "male|fat_burn|normal weight": {
    schedule: "Moderate cardio, Strength training, and 5000 steps walking",
    mealPlan: "Balanced diet with moderate protein and carbohydrates: Chicken breast, brown rice, spinach, eggs, apple"
  },
  "male|muscle_gain|obesity": {
    schedule: "Low-impact cardio, Swimming, and 10000 steps walking",
    mealPlan: "Low-calorie, nutrient-dense diet with portion control: carrot sticks,grilled chicken breast,steamed broccoli, Greek yogurt, mixed nuts, baked salmon, leafy greens, roasted sweet potatoes"
  },
  "male|fat_burn|obesity": {
    schedule: "Low-impact cardio, Swimming, and 10000 steps walking",
    mealPlan: "Low-calorie, nutrient-dense diet with portion control: carrot sticks,grilled chicken breast,steamed broccoli, Greek yogurt, mixed nuts, baked salmon, leafy greens, roasted sweet potatoes"
  },
  "male|fat_burn|overweight": {
    schedule: "High-intensity interval training (HIIT), Cardio, and 8000 steps walking",
    mealPlan: "Low-carb, high-fiber diet: Avocado, grilled fish, broccoli, almonds, leafy greens"
  }
};

/**
 * Parses GYM.csv once and populates the cache.
 */
async function loadCsvRecommendations() {
  if (csvRecommendationsCache) return csvRecommendationsCache;

  const cache = {};

  try {
    const { pool } = require('../db');
    const res = await pool.query('SELECT gender, goal, bmi_category, schedule, meal_plan FROM gym_csv_recommendations');

    if (res.rows.length === 0) {
      console.warn("No rows found in gym_csv_recommendations table, using fallback lookup");
      csvRecommendationsCache = fallbackRecommendations;
      return fallbackRecommendations;
    }

    for (const row of res.rows) {
      const gender = row.gender.trim().toLowerCase();
      const goal = row.goal.trim().toLowerCase();
      const bmiCategory = row.bmi_category.trim().toLowerCase();
      const key = `${gender}|${goal}|${bmiCategory}`;
      cache[key] = {
        schedule: row.schedule,
        mealPlan: row.meal_plan
      };
    }

    csvRecommendationsCache = cache;
    console.log(`Successfully cached ${res.rows.length} recommendations from gym_csv_recommendations table`);
    return cache;
  } catch (error) {
    console.error("Failed to query gym_csv_recommendations table:", error);
    csvRecommendationsCache = fallbackRecommendations;
    return fallbackRecommendations;
  }
}

/**
 * Calculates BMI from weight (kg) and height (cm)
 */
function calculateBMI(weightStr, heightStr) {
  const weight = parseFloat(weightStr?.toString().replace(/[^0-9.]/g, '')) || 70;
  const height = parseFloat(heightStr?.toString().replace(/[^0-9.]/g, '')) || 170;
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  return {
    bmi: Math.round(bmi * 10) / 10,
    weight,
    height
  };
}

/**
 * Determines BMI category
 */
function getBMICategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obesity';
}

/**
 * Helper to calculate targets (Calories, Protein, Carbs, Fat)
 * Uses Katch-McArdle if body_fat is available, otherwise Mifflin-St Jeor
 */
function calculateNutrientTargets(user) {
  const { bmi, weight, height } = calculateBMI(user.weight, user.height);
  const age = parseInt(user.age) || 30;
  const gender = (user.gender || 'Male').toLowerCase();
  const activity = (user.activity_level || 'Lightly Active').toLowerCase();
  const goal = (user.fitness_goal || 'Maintain').toLowerCase();
  const bodyFatVal = parseFloat(user.body_fat?.toString().replace(/[^0-9.]/g, ''));

  // Calorie calculation
  let bmr;
  if (!isNaN(bodyFatVal) && bodyFatVal > 0 && bodyFatVal < 60) {
    const lbm = weight * (1 - bodyFatVal / 100);
    bmr = 370 + (21.6 * lbm);
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender === 'female' || gender.startsWith('f')) {
      bmr -= 161;
    } else {
      bmr += 5;
    }
  }

  // Activity Multipliers
  // ✅ FIXED - removed catch-all 'active' check
let multiplier = 1.375; // Lightly Active default
if (activity.includes('sedentary')) multiplier = 1.2;
else if (activity.includes('extreme') || activity.includes('extra')) multiplier = 1.9;
else if (activity.includes('very')) multiplier = 1.725;
else if (activity.includes('moderate')) multiplier = 1.55;
  let tdee = bmr * multiplier;

  // Adjust for Goal
  if (goal.includes('lose') || goal.includes('burn') || goal.includes('cut') || goal.includes('fat_burn')) {
    tdee -= 500;
  } else if (goal.includes('gain') || goal.includes('build') || goal.includes('muscle') || goal.includes('muscle_gain')) {
    tdee += 500;
  }

  const caloriesTarget = Math.round(tdee);
  
  // Macros calculation
  let proteinTarget = Math.round(weight * 2.0);
  if (goal.includes('gain') || goal.includes('muscle') || goal.includes('muscle_gain')) {
    proteinTarget = Math.round(weight * 2.2);
  }
  
  let fatTarget = Math.round(weight * 0.9);
  let carbsTarget = Math.round((caloriesTarget - (proteinTarget * 4) - (fatTarget * 9)) / 4);
  if (carbsTarget < 50) carbsTarget = 50;

  return {
    bmi,
    bmiCategory: getBMICategory(bmi),
    caloriesTarget,
    proteinTarget,
    carbsTarget,
    fatTarget
  };
}

// Baseline clean recipes
const baseRecipes = {
  breakfast: [
    {
      title: "Spinach & Feta Egg Scramble with Apple",
      description: "A perfectly balanced high-protein start to the day.",
      instructions: "Scramble eggs with fresh spinach and crumbled feta in a lightly oiled pan. Serve alongside a crisp sliced apple.",
      base_calories: 450, base_protein: 24, base_carbs: 40, base_fat: 20,
      ingredients: [
        { name: "Whole Eggs", base_quantity: 3, unit: "large" },
        { name: "Fresh Spinach", base_quantity: 50, unit: "g" },
        { name: "Feta Cheese", base_quantity: 30, unit: "g" },
        { name: "Apple", base_quantity: 1, unit: "medium" }
      ]
    },
    {
      title: "Peanut Butter & Banana Oat Shake",
      description: "A delicious calorie-dense breakfast with healthy fats and complex carbs.",
      instructions: "Blend oats, milk, peanut butter, and a sliced banana. Top with honey and a dash of cinnamon.",
      base_calories: 550, base_protein: 22, base_carbs: 65, base_fat: 24,
      ingredients: [
        { name: "Whole Rolled Oats", base_quantity: 60, unit: "g" },
        { name: "Whole Milk", base_quantity: 250, unit: "ml" },
        { name: "Peanut Butter", base_quantity: 30, unit: "g" },
        { name: "Banana", base_quantity: 1, unit: "medium" }
      ]
    }
  ],
  lunch: [
    {
      title: "Balanced Chicken, Brown Rice & Broccoli Bowl",
      description: "Lean protein and complex fiber-rich grains to fuel recovery.",
      instructions: "Grill chicken breast, boil brown rice, steam broccoli. Drizzle with sesame oil and season.",
      base_calories: 600, base_protein: 42, base_carbs: 65, base_fat: 16,
      ingredients: [
        { name: "Chicken Breast", base_quantity: 150, unit: "g" },
        { name: "Brown Rice", base_quantity: 150, unit: "g cooked" },
        { name: "Broccoli", base_quantity: 100, unit: "g" },
        { name: "Olive Oil", base_quantity: 2, unit: "tsp" }
      ]
    },
    {
      title: "Grilled Salmon & Quinoa Medley",
      description: "Rich in healthy Omega-3 fats and slow-digesting complex carbs.",
      instructions: "Sear salmon fillet. Serve alongside fluffy cooked quinoa and steam asparagus.",
      base_calories: 650, base_protein: 38, base_carbs: 55, base_fat: 24,
      ingredients: [
        { name: "Salmon Fillet", base_quantity: 150, unit: "g" },
        { name: "Quinoa", base_quantity: 120, unit: "g cooked" },
        { name: "Asparagus", base_quantity: 100, unit: "g" },
        { name: "Almonds", base_quantity: 15, unit: "g" }
      ]
    }
  ],
  dinner: [
    {
      title: "Beef Stir-Fry with Leafy Greens & Peppers",
      description: "High-iron protein stir-fry with dynamic micronutrients.",
      instructions: "Sauté lean beef strips with sliced bell peppers, fresh baby spinach, and sesame oil.",
      base_calories: 500, base_protein: 40, base_carbs: 18, base_fat: 28,
      ingredients: [
        { name: "Lean Beef Strips", base_quantity: 150, unit: "g" },
        { name: "Bell Pepper", base_quantity: 1, unit: "medium" },
        { name: "Spinach", base_quantity: 100, unit: "g" },
        { name: "Sesame Oil", base_quantity: 1, unit: "tbsp" }
      ]
    },
    {
      title: "Baked White Fish & Veggie Skillet",
      description: "Extremely lean fish platter with dynamic mineral-dense vegetables.",
      instructions: "Bake cod fillet. Steam broccoli and plate next to fresh sliced cucumber.",
      base_calories: 350, base_protein: 30, base_carbs: 25, base_fat: 8,
      ingredients: [
        { name: "Cod Fillet", base_quantity: 150, unit: "g" },
        { name: "Steamed Broccoli", base_quantity: 120, unit: "g" },
        { name: "Carrot Sticks", base_quantity: 80, unit: "g" }
      ]
    }
  ],
  snack: [
    {
      title: "Greek Yogurt with Berries & Almonds",
      description: "High-protein snack with dynamic antioxidant-rich berries.",
      instructions: "Serve greek yogurt in a bowl, top with almonds and fresh berries.",
      base_calories: 300, base_protein: 18, base_carbs: 25, base_fat: 12,
      ingredients: [
        { name: "Greek Yogurt", base_quantity: 200, unit: "g" },
        { name: "Blueberries", base_quantity: 50, unit: "g" },
        { name: "Almonds", base_quantity: 15, unit: "g" }
      ]
    },
    {
      title: "Cucumber & Hummus Dippers",
      description: "Crispy clean vegetables dipped in premium healthy fats.",
      instructions: "Slice cucumber into long sticks and dip into roasted garlic hummus.",
      base_calories: 200, base_protein: 6, base_carbs: 15, base_fat: 14,
      ingredients: [
        { name: "Cucumber", base_quantity: 1, unit: "large" },
        { name: "Hummus", base_quantity: 60, unit: "g" }
      ]
    }
  ]
};

// Formatter for scaled quantities
function formatScaledQuantity(qty, unit) {
  if (unit === 'g' || unit === 'ml' || unit.includes('g cooked') || unit.includes('g raw')) {
    return `${Math.round(qty / 5) * 5}${unit}`;
  }
  const rounded = Math.round(qty * 10) / 10;
  return `${rounded} ${unit}`;
}

// Adapt ingredients dynamically for Vegetarian/Vegan preferences
function adaptIngredients(ingredients, dietType, foodPreference) {
  const isVeg = (dietType || '').toLowerCase().includes('veg') || (foodPreference || '').toLowerCase().includes('veg');
  const isVegan = (dietType || '').toLowerCase().includes('vegan') || (foodPreference || '').toLowerCase().includes('vegan');

  return ingredients.map(ing => {
    let name = ing.name;
    if (isVegan) {
      if (name.includes('Chicken') || name.includes('Beef') || name.includes('Salmon') || name.includes('Cod') || name.includes('Fish')) {
        name = 'Extra Firm Tofu';
      } else if (name.includes('Eggs')) {
        name = 'Scrambled Tofu';
      } else if (name.includes('Feta') || name.includes('Cheese')) {
        name = 'Vegan Almond Feta';
      } else if (name.includes('Yogurt')) {
        name = 'Plain Coconut Yogurt';
      } else if (name.includes('Milk')) {
        name = 'Almond Milk';
      } else if (name.includes('Honey')) {
        name = 'Maple Syrup';
      }
    } else if (isVeg) {
      if (name.includes('Chicken') || name.includes('Beef') || name.includes('Salmon') || name.includes('Cod') || name.includes('Fish')) {
        name = 'Tempeh / Paneer';
      }
    }
    return { ...ing, name };
  });
}

// Generates dynamic meal plans based on target count
function generateDynamicMealPlan(user, caloriesTarget, proteinTarget, carbsTarget, fatTarget, mealsPerDay) {
  const count = parseInt(mealsPerDay) || 4;

  // Determine distribution of calories/macros
  let distribution = [];
  if (count === 3) {
    distribution = [
      { meal_type: 'Breakfast', share: 0.35, category: 'breakfast', recipeIdx: 0 },
      { meal_type: 'Lunch', share: 0.40, category: 'lunch', recipeIdx: 0 },
      { meal_type: 'Dinner', share: 0.25, category: 'dinner', recipeIdx: 0 }
    ];
  } else if (count === 5) {
    distribution = [
      { meal_type: 'Breakfast', share: 0.25, category: 'breakfast', recipeIdx: 0 },
      { meal_type: 'Mid-Morning Snack', share: 0.10, category: 'snack', recipeIdx: 0 },
      { meal_type: 'Lunch', share: 0.35, category: 'lunch', recipeIdx: 0 },
      { meal_type: 'Afternoon Snack', share: 0.10, category: 'snack', recipeIdx: 1 },
      { meal_type: 'Dinner', share: 0.20, category: 'dinner', recipeIdx: 0 }
    ];
  } else if (count === 2) {
    distribution = [
      { meal_type: 'Brunch', share: 0.50, category: 'lunch', recipeIdx: 1 },
      { meal_type: 'Dinner', share: 0.50, category: 'dinner', recipeIdx: 0 }
    ];
  } else if (count >= 6) {
    distribution = [
      { meal_type: 'Breakfast', share: 0.20, category: 'breakfast', recipeIdx: 0 },
      { meal_type: 'Mid-Morning Snack', share: 0.10, category: 'snack', recipeIdx: 0 },
      { meal_type: 'Lunch', share: 0.30, category: 'lunch', recipeIdx: 0 },
      { meal_type: 'Afternoon Snack', share: 0.10, category: 'snack', recipeIdx: 1 },
      { meal_type: 'Dinner', share: 0.20, category: 'dinner', recipeIdx: 0 },
      { meal_type: 'Late-Night Snack', share: 0.10, category: 'snack', recipeIdx: 0 }
    ];
  } else {
    // 4 Meals (Default)
    distribution = [
      { meal_type: 'Breakfast', share: 0.25, category: 'breakfast', recipeIdx: 0 },
      { meal_type: 'Lunch', share: 0.35, category: 'lunch', recipeIdx: 0 },
      { meal_type: 'Snack', share: 0.15, category: 'snack', recipeIdx: 0 },
      { meal_type: 'Dinner', share: 0.25, category: 'dinner', recipeIdx: 0 }
    ];
  }

  const generatedMeals = distribution.map(dist => {
    const list = baseRecipes[dist.category] || baseRecipes.breakfast;
    const base = list[dist.recipeIdx % list.length];

    const targetCal = caloriesTarget * dist.share;
    const scale = targetCal / base.base_calories;

    // Adapt and scale ingredients
    const adapted = adaptIngredients(base.ingredients, user.diet_type, user.food_preference);
    const scaledIngredients = adapted.map(ing => ({
      name: ing.name,
      quantity: formatScaledQuantity(ing.base_quantity * scale, ing.unit)
    }));

    return {
      meal_type: dist.meal_type,
      title: base.title,
      description: base.description,
      instructions: base.instructions,
      calories: Math.round(caloriesTarget * dist.share),
      protein: Math.round(proteinTarget * dist.share),
      carbs: Math.round(carbsTarget * dist.share),
      fat: Math.round(fatTarget * dist.share),
      ingredients: scaledIngredients
    };
  });

  return generatedMeals;
}

module.exports = {
  loadCsvRecommendations,
  calculateBMI,
  getBMICategory,
  calculateNutrientTargets,
  generateDynamicMealPlan
};
