const { callAI } = require('./ai');
const { generateDynamicMealPlan } = require('./recommendations');

/**
 * Maps a meal slot to DB-friendly meal_type filter keywords.
 */
const MEAL_TYPE_KEYWORDS = {
  breakfast: ['breakfast', 'morning', 'brunch'],
  lunch:     ['lunch', 'main', 'entree', 'dinner'],
  dinner:    ['dinner', 'evening', 'main', 'entree'],
  snack:     ['snack', 'dessert', 'treat', 'appetizer'],
};

/**
 * Builds diet type exclusion SQL conditions.
 */
function buildDietFilter(dietType, foodPreference) {
  const isVegan  = /vegan/i.test(dietType || '') || /vegan/i.test(foodPreference || '');
  const isVeg    = /veg/i.test(dietType || '')   || /veg/i.test(foodPreference || '');
  const excludes = [];

  if (isVegan) {
    excludes.push(
      "category NOT ILIKE '%meat%'",
      "category NOT ILIKE '%poultry%'",
      "category NOT ILIKE '%fish%'",
      "category NOT ILIKE '%seafood%'",
      "category NOT ILIKE '%dairy%'",
      "category NOT ILIKE '%egg%'",
      "food_name NOT ILIKE '%chicken%'",
      "food_name NOT ILIKE '%beef%'",
      "food_name NOT ILIKE '%pork%'",
      "food_name NOT ILIKE '%salmon%'",
      "food_name NOT ILIKE '%tuna%'",
      "food_name NOT ILIKE '%egg%'",
      "food_name NOT ILIKE '%milk%'",
      "food_name NOT ILIKE '%cheese%'",
      "food_name NOT ILIKE '%yogurt%'"
    );
  } else if (isVeg) {
    excludes.push(
      "category NOT ILIKE '%meat%'",
      "category NOT ILIKE '%poultry%'",
      "category NOT ILIKE '%fish%'",
      "category NOT ILIKE '%seafood%'",
      "food_name NOT ILIKE '%chicken%'",
      "food_name NOT ILIKE '%beef%'",
      "food_name NOT ILIKE '%pork%'",
      "food_name NOT ILIKE '%salmon%'",
      "food_name NOT ILIKE '%tuna%'"
    );
  }

  return excludes;
}

/**
 * Retrieves real food candidates from the PostgreSQL food_database per meal slot.
 * Uses smart macro-targeted SQL queries — the core "Retrieval" step in RAG.
 *
 * @param {object} pool - pg Pool
 * @param {object} targets - { caloriesTarget, proteinTarget, carbsTarget, fatTarget }
 * @param {string} dietType
 * @param {string} foodPreference
 * @returns {object} { breakfast[], lunch[], dinner[], snack[] }
 */
async function retrieveFoodsForDietPlan(pool, targets, dietType, foodPreference) {
  const { caloriesTarget, proteinTarget } = targets;

  const dietConditions = buildDietFilter(dietType, foodPreference);
  const baseConditions = [
    "calories_kcal IS NOT NULL",
    "calories_kcal > 0",
    "calories_kcal < 900",
    "protein_g IS NOT NULL",
    "food_name IS NOT NULL",
    ...dietConditions,
  ];

  const slots = {
    breakfast: {
      extraConditions: ["calories_kcal BETWEEN 80 AND 600"],
      minProtein: Math.min(10, proteinTarget * 0.05),
      keywords: MEAL_TYPE_KEYWORDS.breakfast,
      limit: 15,
    },
    lunch: {
      extraConditions: ["calories_kcal BETWEEN 100 AND 750"],
      minProtein: Math.min(15, proteinTarget * 0.08),
      keywords: MEAL_TYPE_KEYWORDS.lunch,
      limit: 15,
    },
    dinner: {
      extraConditions: ["calories_kcal BETWEEN 80 AND 700"],
      minProtein: Math.min(15, proteinTarget * 0.08),
      keywords: MEAL_TYPE_KEYWORDS.dinner,
      limit: 15,
    },
    snack: {
      extraConditions: ["calories_kcal BETWEEN 20 AND 300"],
      minProtein: 0,
      keywords: MEAL_TYPE_KEYWORDS.snack,
      limit: 10,
    },
  };

  const result = {};

  await Promise.all(
    Object.entries(slots).map(async ([slot, config]) => {
      try {
        const conditions = [...baseConditions, ...config.extraConditions];

        if (config.minProtein > 0) {
          conditions.push(`protein_g >= ${config.minProtein}`);
        }

        // Build keyword OR clause for meal_type column
        const keywordClauses = config.keywords.map(
          kw => `meal_type ILIKE '%${kw}%'`
        ).join(' OR ');

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        // Priority: foods matching meal_type keywords first, then high nutrition_density
        const query = `
          SELECT
            food_name, category, meal_type,
            serving_size,
            ROUND(calories_kcal::numeric, 1) AS calories_kcal,
            ROUND(protein_g::numeric, 1) AS protein_g,
            ROUND(carbohydrates_g::numeric, 1) AS carbohydrates_g,
            ROUND(fat_g::numeric, 1) AS fat_g,
            ROUND(fiber_g::numeric, 1) AS fiber_g,
            nutrition_grade, image_url, image_small_url
          FROM food_database
          ${whereClause}
          ORDER BY
            CASE WHEN (${keywordClauses}) THEN 0 ELSE 1 END ASC,
            (image_url IS NOT NULL AND image_url != '') DESC,
            nutrition_density DESC NULLS LAST
          LIMIT ${config.limit}
        `;

        const res = await pool.query(query);
        result[slot] = res.rows;
      } catch (err) {
        console.error(`[DietRAG] Failed to retrieve foods for slot "${slot}":`, err.message);
        result[slot] = [];
      }
    })
  );

  return result;
}

/**
 * Formats a food row into a compact string for the AI prompt.
 */
function formatFoodForPrompt(food) {
  const img = food.image_url || food.image_small_url || null;
  return `- ${food.food_name} | serving: ${food.serving_size || '100g'} | cal: ${food.calories_kcal} | protein: ${food.protein_g}g | carbs: ${food.carbohydrates_g}g | fat: ${food.fat_g}g${img ? ` | image_url: ${img}` : ''}`;
}

/**
 * Builds the structured AI prompt for diet plan generation.
 *
 * @param {object} user - Full user profile row
 * @param {object} targets - Calculated macro targets
 * @param {object} foodsPerMeal - { breakfast[], lunch[], dinner[], snack[] } from DB
 * @param {Array}  distribution - Meal distribution plan with meal_type, share, category
 * @returns {string} AI prompt
 */
function buildDietPrompt(user, targets, foodsPerMeal, distribution) {
  const { caloriesTarget, proteinTarget, carbsTarget, fatTarget } = targets;
  const goal     = user.fitness_goal   || 'Maintain';
  const dietType = user.diet_type      || 'Standard';
  const activity = user.activity_level || 'Lightly Active';
  const pref     = user.food_preference ? `Food preferences: ${user.food_preference}.` : '';

  const mealSections = distribution.map(dist => {
    const mealCal  = Math.round(caloriesTarget * dist.share);
    const mealProt = Math.round(proteinTarget  * dist.share);
    const mealCarb = Math.round(carbsTarget    * dist.share);
    const mealFat  = Math.round(fatTarget      * dist.share);
    const foods    = foodsPerMeal[dist.category] || [];

    const foodList = foods.length > 0
      ? foods.map(formatFoodForPrompt).join('\n')
      : '(no foods retrieved — use general knowledge for this slot)';

    return `
=== ${dist.meal_type} (Target: ~${mealCal} kcal | ~${mealProt}g protein | ~${mealCarb}g carbs | ~${mealFat}g fat) ===
Available real foods from database (ONLY use these):
${foodList}`;
  }).join('\n\n');

  return `You are a professional sports dietitian AI. Generate a personalized ${distribution.length}-meal diet plan for this user.

USER PROFILE:
- Goal: ${goal}
- Diet type: ${dietType}
- Activity level: ${activity}
- ${pref}
- Daily targets: ${caloriesTarget} kcal | ${proteinTarget}g protein | ${carbsTarget}g carbs | ${fatTarget}g fat

MEAL SLOTS AND AVAILABLE REAL FOODS:
${mealSections}

INSTRUCTIONS:
1. For EACH meal slot, choose 2-4 foods from the "Available real foods" list above.
2. Specify realistic serving sizes and quantities (e.g., "150g", "2 large", "1 cup").
3. The meal's total macros should closely match the target (within 15%).
4. Write a short appealing title and a 1-sentence description.
5. Write simple 2-3 step cooking instructions.
6. Include the EXACT image_url from the food list if provided (do NOT change or invent image URLs).
7. For each ingredient, include estimated macros for the CHOSEN quantity (not per 100g).
8. Do NOT hallucinate food names — only use foods from the lists provided.

RETURN FORMAT (valid JSON array, no markdown fences, no extra text):
[
  {
    "meal_type": "Breakfast",
    "title": "Short appealing meal title",
    "description": "One sentence description.",
    "instructions": "Step 1. Step 2. Step 3.",
    "calories": 480,
    "protein": 32,
    "carbs": 45,
    "fat": 14,
    "ingredients": [
      {
        "name": "Exact food name from the list",
        "quantity": "150g",
        "calories": 210,
        "protein": 18,
        "carbs": 2,
        "fat": 14,
        "image_url": "https://... (exact URL from food list or null)"
      }
    ]
  }
]`;
}

/**
 * Determines the meal distribution based on meals_per_day.
 */
function getMealDistribution(mealsPerDay) {
  const count = parseInt(mealsPerDay) || 4;

  if (count === 2) {
    return [
      { meal_type: 'Brunch',  share: 0.50, category: 'lunch' },
      { meal_type: 'Dinner',  share: 0.50, category: 'dinner' },
    ];
  }
  if (count === 3) {
    return [
      { meal_type: 'Breakfast', share: 0.35, category: 'breakfast' },
      { meal_type: 'Lunch',     share: 0.40, category: 'lunch' },
      { meal_type: 'Dinner',    share: 0.25, category: 'dinner' },
    ];
  }
  if (count === 5) {
    return [
      { meal_type: 'Breakfast',          share: 0.25, category: 'breakfast' },
      { meal_type: 'Mid-Morning Snack',  share: 0.10, category: 'snack' },
      { meal_type: 'Lunch',              share: 0.35, category: 'lunch' },
      { meal_type: 'Afternoon Snack',    share: 0.10, category: 'snack' },
      { meal_type: 'Dinner',             share: 0.20, category: 'dinner' },
    ];
  }
  if (count >= 6) {
    return [
      { meal_type: 'Breakfast',          share: 0.20, category: 'breakfast' },
      { meal_type: 'Mid-Morning Snack',  share: 0.10, category: 'snack' },
      { meal_type: 'Lunch',              share: 0.30, category: 'lunch' },
      { meal_type: 'Afternoon Snack',    share: 0.10, category: 'snack' },
      { meal_type: 'Dinner',             share: 0.20, category: 'dinner' },
      { meal_type: 'Late-Night Snack',   share: 0.10, category: 'snack' },
    ];
  }
  // Default: 4 meals
  return [
    { meal_type: 'Breakfast', share: 0.25, category: 'breakfast' },
    { meal_type: 'Lunch',     share: 0.35, category: 'lunch' },
    { meal_type: 'Snack',     share: 0.15, category: 'snack' },
    { meal_type: 'Dinner',    share: 0.25, category: 'dinner' },
  ];
}

/**
 * Main pipeline: Retrieve → Augment → Generate.
 * Falls back to the static template generator if AI fails.
 *
 * @param {object} user - Full user profile from DB
 * @param {object} targets - { caloriesTarget, proteinTarget, carbsTarget, fatTarget }
 * @param {number} mealsPerDay
 * @param {object} pool - pg Pool
 * @returns {Array} Array of meal objects
 */
async function generateAIDietPlan(user, targets, mealsPerDay, pool) {
  const { caloriesTarget, proteinTarget, carbsTarget, fatTarget } = targets;
  const distribution = getMealDistribution(mealsPerDay);

  console.log('[DietRAG] Step 1: Retrieving real foods from database...');
  let foodsPerMeal = {};
  try {
    foodsPerMeal = await retrieveFoodsForDietPlan(
      pool,
      targets,
      user.diet_type,
      user.food_preference
    );

    const counts = Object.entries(foodsPerMeal)
      .map(([k, v]) => `${k}: ${v.length}`)
      .join(', ');
    console.log(`[DietRAG] Foods retrieved — ${counts}`);
  } catch (err) {
    console.error('[DietRAG] Food retrieval failed, will use general AI knowledge:', err.message);
  }

  console.log('[DietRAG] Step 2: Building AI prompt...');
  const prompt = buildDietPrompt(user, targets, foodsPerMeal, distribution);

  console.log('[DietRAG] Step 3: Calling AI for plan generation (Groq / Llama-4 Scout)...');
  let aiResponse;
  try {
    aiResponse = await callAI(
      prompt,
      null,
      'groq',          // ← same model/provider as meal analysis & nutrient detection
      { max_tokens: 4096, temperature: 0.3 }
    );
  } catch (aiErr) {
    console.error('[DietRAG] AI call failed, using static fallback:', aiErr.message);
    return generateDynamicMealPlan(user, caloriesTarget, proteinTarget, carbsTarget, fatTarget, mealsPerDay);
  }

  // Parse AI response
  console.log('[DietRAG] Step 4: Parsing AI response...');
  try {
    // Strip any markdown fences
    const fencedMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const arrMatch    = aiResponse.match(/\[[\s\S]*\]/);
    const jsonString  = fencedMatch ? fencedMatch[1].trim() : arrMatch ? arrMatch[0] : null;

    if (!jsonString) throw new Error('No JSON array found in AI response');

    const parsed = JSON.parse(jsonString);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('AI returned empty or non-array meal plan');
    }

    // Validate and sanitise each meal
    const sanitised = parsed.map((meal, i) => ({
      meal_type:    meal.meal_type    || distribution[i]?.meal_type || `Meal ${i + 1}`,
      title:        meal.title        || 'Balanced Meal',
      description:  meal.description  || '',
      instructions: meal.instructions || '',
      calories:     Math.round(Number(meal.calories) || 0),
      protein:      Math.round(Number(meal.protein)  || 0),
      carbs:        Math.round(Number(meal.carbs)    || 0),
      fat:          Math.round(Number(meal.fat)      || 0),
      ingredients:  Array.isArray(meal.ingredients)
        ? meal.ingredients.map(ing => ({
            name:      ing.name      || 'Ingredient',
            quantity:  ing.quantity  || '',
            calories:  Math.round(Number(ing.calories) || 0),
            protein:   Math.round(Number(ing.protein)  || 0),
            carbs:     Math.round(Number(ing.carbs)    || 0),
            fat:       Math.round(Number(ing.fat)      || 0),
            image_url: ing.image_url || null,
          }))
        : [],
    }));

    console.log(`[DietRAG] ✅ AI diet plan generated — ${sanitised.length} meals`);
    return sanitised;

  } catch (parseErr) {
    console.error('[DietRAG] Parse failed, using static fallback:', parseErr.message);
    console.error('[DietRAG] Raw AI response (first 500 chars):', aiResponse?.slice(0, 500));
    return generateDynamicMealPlan(user, caloriesTarget, proteinTarget, carbsTarget, fatTarget, mealsPerDay);
  }
}

module.exports = { generateAIDietPlan };
