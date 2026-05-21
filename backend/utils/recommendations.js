const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
 */
function calculateNutrientTargets(user) {
  const { bmi, weight, height } = calculateBMI(user.weight, user.height);
  const age = parseInt(user.age) || 30;
  const gender = (user.gender || 'Male').toLowerCase();
  const activity = (user.activity_level || 'Lightly Active').toLowerCase();
  const goal = (user.fitness_goal || 'Maintain').toLowerCase();

  // Mifflin-St Jeor Equation
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (gender === 'female' || gender.startsWith('f')) {
    bmr -= 161;
  } else {
    bmr += 5;
  }

  // Activity Multipliers
  let multiplier = 1.375; // Default lightly active
  if (activity.includes('sedentary')) multiplier = 1.2;
  else if (activity.includes('moderate')) multiplier = 1.55;
  else if (activity.includes('very') || activity.includes('high')) multiplier = 1.725;

  let tdee = bmr * multiplier;

  // Adjust for Goal
  if (goal.includes('lose') || goal.includes('burn') || goal.includes('cut') || goal.includes('fat_burn')) {
    tdee -= 500;
  } else if (goal.includes('gain') || goal.includes('bulk') || goal.includes('muscle_gain')) {
    tdee += 500;
  }

  const caloriesTarget = Math.round(tdee);
  
  // Macros calculation
  let proteinTarget = Math.round(weight * 2.0); // 2g per kg of weight
  if (goal.includes('gain') || goal.includes('muscle_gain')) {
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

module.exports = {
  loadCsvRecommendations,
  calculateBMI,
  getBMICategory,
  calculateNutrientTargets
};
