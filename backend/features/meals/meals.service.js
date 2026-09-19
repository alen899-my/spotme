const { pool } = require('../../db');
const { callAI } = require('../../utils/ai');
const { awardXP, XP_VALUES } = require('../../utils/xp');
const { invalidateLeaderboardCache } = require('../../utils/cache');
const { loadCsvRecommendations, calculateNutrientTargets } = require('../../utils/recommendations');
const { generateAIDietPlan } = require('../../utils/dietPlanGenerator');

function cleanFoodName(name) {
  if (!name) return '';
  let decoded = name
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°');
  try { decoded = decodeURIComponent(escape(decoded)); } catch (e) {
    console.warn('Food name decode failed:', e);
  }
  decoded = decoded.replace(/\\"/g, '"').replace(/\\'/g, "'");
  decoded = decoded.replace(/["*]/g, '');
  decoded = decoded.replace(/^['\s,\-]+|['\s,\-]+$/g, '');
  decoded = decoded.replace(/\s+/g, ' ');
  return decoded.trim();
}

/**
 * AI image nutritional analysis.
 */
async function analyzeMealPhoto(fileKey, description) {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL.endsWith('/')
    ? process.env.CLOUDFLARE_R2_PUBLIC_URL.slice(0, -1)
    : process.env.CLOUDFLARE_R2_PUBLIC_URL;

  const imageUrl = `${publicUrl}/${fileKey}`;

  const prompt = `
You are a high-precision food recognition AI. Your goal is to analyze the provided image and return a detailed, accurate nutritional breakdown.

${description ? `CRITICAL CONTEXT: The user has provided this description: "${description}". Use this to resolve any visual ambiguity (e.g., identifying a specific type of soup or hidden ingredient).` : ''}

ANALYSIS PROTOCOL:
1. IDENTIFY: List every visible food and beverage. Be specific (e.g., "Sourdough bread" vs "bread").
2. QUANTIFY: Estimate portions in standard units (cups, grams, oz). Use the plate/cutlery for scale.
3. NUTRITION: Calculate macros based on verified nutritional data. Do not use generic rounded numbers.
4. HONESTY: If an item is unrecognizable, do not hallucinate. List it as "Unknown item" with 0 macros or use the user's description to identify it.

RETURN FORMAT:
Return ONLY a valid JSON object with the following structure. No conversational text.
{
  "items": [
    {
      "item_name": "Specific food name",
      "quantity": "Amount (e.g., 150g)",
      "calories": 0,
      "protein": 0.0,
      "carbs": 0.0,
      "fat": 0.0,
      "fiber": 0.0,
      "sugar": 0.0,
      "sodium": 0,
      "saturated_fat": 0.0,
      "cholesterol": 0
    }
  ],
  "total_calories": 0,
  "total_protein": 0.0,
  "total_carbs": 0.0,
  "total_fat": 0.0,
  "total_fiber": 0.0,
  "total_sugar": 0.0,
  "total_sodium": 0,
  "total_saturated_fat": 0.0,
  "total_cholesterol": 0
}
`.trim();

  const aiResponse = await callAI(prompt, imageUrl, null);

  let analysis = null;
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse AI JSON:', jsonMatch[0]);
    }
  }

  if (!analysis) {
    throw new Error('Could not parse nutrition data from the photo.');
  }

  return { imageUrl, analysis };
}

/**
 * Save logged meal and items, award XP.
 */
async function saveMeal(userId, mealData) {
  const {
    image_url, meal_type,
    total_calories, total_protein, total_carbs, total_fat,
    total_fiber, total_sugar, total_sodium, total_saturated_fat, total_cholesterol,
    items
  } = mealData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const mealResult = await client.query(
      `INSERT INTO meals (
        user_id, image_url, meal_type, 
        total_calories, total_protein, total_carbs, total_fat,
        total_fiber, total_sugar, total_sodium, total_saturated_fat, total_cholesterol,
        logged_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING *`,
      [
        userId, image_url, meal_type,
        total_calories, total_protein, total_carbs, total_fat,
        total_fiber || 0, total_sugar || 0, total_sodium || 0, total_saturated_fat || 0, total_cholesterol || 0
      ]
    );

    const mealId = mealResult.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO meal_items (
          meal_id, item_name, quantity, 
          calories, protein, carbs, fat,
          fiber, sugar, sodium, saturated_fat, cholesterol
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          mealId, item.item_name, item.quantity || '',
          item.calories, item.protein, item.carbs, item.fat,
          item.fiber || 0, item.sugar || 0, item.sodium || 0, item.saturated_fat || 0, item.cholesterol || 0
        ]
      );
    }

    const savedItems = await client.query(
      'SELECT * FROM meal_items WHERE meal_id = $1 ORDER BY id',
      [mealId]
    );

    const awardRes = await awardXP(client, userId, XP_VALUES.LOG_MEAL, 'Logged a meal');

    await client.query('COMMIT');
    invalidateLeaderboardCache();

    return {
      ...mealResult.rows[0],
      items: savedItems.rows,
      xp_awarded: XP_VALUES.LOG_MEAL,
      new_tier: awardRes.tier,
      leveled_up: awardRes.leveledUp
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update meal and items.
 */
async function updateMeal(userId, mealId, mealData) {
  const {
    image_url, meal_type,
    total_calories, total_protein, total_carbs, total_fat,
    total_fiber, total_sugar, total_sodium, total_saturated_fat, total_cholesterol,
    items
  } = mealData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const mealResult = await client.query(
      `UPDATE meals SET
        image_url = $1, meal_type = $2,
        total_calories = $3, total_protein = $4, total_carbs = $5, total_fat = $6,
        total_fiber = $7, total_sugar = $8, total_sodium = $9, total_saturated_fat = $10, total_cholesterol = $11
       WHERE id = $12 AND user_id = $13 RETURNING *`,
      [
        image_url, meal_type,
        total_calories, total_protein, total_carbs, total_fat,
        total_fiber || 0, total_sugar || 0, total_sodium || 0, total_saturated_fat || 0, total_cholesterol || 0,
        mealId, userId
      ]
    );

    if (mealResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('DELETE FROM meal_items WHERE meal_id = $1', [mealId]);

    for (const item of items) {
      await client.query(
        `INSERT INTO meal_items (
          meal_id, item_name, quantity,
          calories, protein, carbs, fat,
          fiber, sugar, sodium, saturated_fat, cholesterol
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          mealId, item.item_name, item.quantity || '',
          item.calories, item.protein, item.carbs, item.fat,
          item.fiber || 0, item.sugar || 0, item.sodium || 0, item.saturated_fat || 0, item.cholesterol || 0
        ]
      );
    }

    const savedItems = await client.query(
      'SELECT * FROM meal_items WHERE meal_id = $1 ORDER BY id',
      [mealId]
    );

    await client.query('COMMIT');
    return {
      ...mealResult.rows[0],
      items: savedItems.rows,
      xp_awarded: null,
      new_tier: null,
      leveled_up: false
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * List user meals.
 */
async function getUserMeals(userId, { page = 1, limit = 50, date }) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = 'WHERE user_id = $1';
  const params = [userId];
  let paramIdx = 2;

  if (date) {
    whereClause += ` AND logged_at::date = $${paramIdx}::date`;
    params.push(date);
    paramIdx++;
  }

  const countRes = await pool.query(
    `SELECT COUNT(*) AS total FROM meals ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0]?.total) || 0;

  params.push(limitNum, offset);
  const meals = await pool.query(
    `SELECT * FROM meals ${whereClause} ORDER BY logged_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    params
  );

  const mealIds = meals.rows.map(m => m.id);
  const itemsByMealId = {};

  if (mealIds.length > 0) {
    const itemsResult = await pool.query(
      'SELECT * FROM meal_items WHERE meal_id = ANY($1::int[]) ORDER BY id',
      [mealIds]
    );
    for (const item of itemsResult.rows) {
      if (!itemsByMealId[item.meal_id]) itemsByMealId[item.meal_id] = [];
      itemsByMealId[item.meal_id].push(item);
    }
  }

  const results = meals.rows.map(meal => ({
    ...meal,
    items: itemsByMealId[meal.id] || [],
  }));

  return { meals: results, total, page: pageNum, limit: limitNum };
}

/**
 * Get meal recommendations based on user profile & CSV grounding.
 */
async function getMealRecommendations(userId) {
  const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (userQuery.rows.length === 0) return null;
  const user = userQuery.rows[0];

  const weightVal = user.weight || '70';
  const heightVal = user.height || '170';
  const goalVal   = user.fitness_goal || 'Maintain';

  // 1. Serve from cache if profile hasn't changed
  const cachedQuery = await pool.query(
    'SELECT * FROM meal_recommendations WHERE user_id = $1',
    [userId]
  );
  if (cachedQuery.rows.length > 0) {
    const cached = cachedQuery.rows[0];
    if (
      cached.user_weight === weightVal &&
      cached.user_height === heightVal &&
      cached.user_goal   === goalVal &&
      cached.meals_per_day === (user.meals_per_day || 4) &&
      cached.gender === (user.gender || 'Male') &&
      (cached.age === null || user.age === null || parseInt(cached.age) === parseInt(user.age)) &&
      cached.activity_level === (user.activity_level || 'Lightly Active') &&
      cached.body_fat === (user.body_fat || '') &&
      cached.diet_type === (user.diet_type || 'Standard') &&
      cached.food_preference === (user.food_preference || '')
    ) {
      const gKey = (user.gender || 'Male').toLowerCase().startsWith('f') ? 'female' : 'male';
      const g    = goalVal.toLowerCase();
      const gGoal = (g.includes('burn') || g.includes('lose') || g.includes('fat') || g.includes('cut')) ? 'fat_burn' : 'muscle_gain';
      return {
        bmi: parseFloat(cached.bmi),
        bmiCategory: cached.bmi_category,
        targets: {
          calories: cached.calories_target,
          protein:  cached.protein_target,
          carbs:    cached.carbs_target,
          fat:      cached.fat_target,
        },
        csvGrounding: {
          gender:   gKey,
          goal:     gGoal,
          schedule: cached.csv_schedule,
          mealPlan: cached.csv_meal_plan,
        },
        recommendedMeals:  cached.recommended_meals,
        profileIncomplete: !user.height || !user.weight,
        user: {
          gender: user.gender,
          age: user.age,
          height: user.height,
          weight: user.weight,
          body_fat: user.body_fat,
          fitness_goal: user.fitness_goal,
          activity_level: user.activity_level,
          diet_type: user.diet_type,
          food_preference: user.food_preference,
          meals_per_day: user.meals_per_day,
          target_weight: user.target_weight
        }
      };
    }
  }

  // 2. Calculate nutrient targets
  const { bmi, bmiCategory, caloriesTarget, proteinTarget, carbsTarget, fatTarget } =
    calculateNutrientTargets(user);

  // 3. Map gender & goal, load GYM dataset alignment from DB
  const genderKey = (user.gender || 'Male').toLowerCase().startsWith('f') ? 'female' : 'male';
  const goalRaw   = goalVal.toLowerCase();
  const goalKey   = (goalRaw.includes('burn') || goalRaw.includes('lose') || goalRaw.includes('fat') || goalRaw.includes('cut'))
    ? 'fat_burn' : 'muscle_gain';

  const csvRecommendations = await loadCsvRecommendations();
  const lookupKey = `${genderKey}|${goalKey}|${bmiCategory.toLowerCase()}`;
  const csvRec = csvRecommendations[lookupKey] || {
    schedule: 'Moderate cardio, Strength training, and 5000 steps walking',
    mealPlan: 'Balanced diet with moderate protein and carbohydrates: Chicken breast, brown rice, spinach, eggs, apple',
  };

  // 4. AI-powered plan generation
  const mealsPerDay = user.meals_per_day || 4;
  const targets = { caloriesTarget, proteinTarget, carbsTarget, fatTarget };
  const recommendedMeals = await generateAIDietPlan(user, targets, mealsPerDay, pool);

  // 5. Persist to cache
  try {
    await pool.query(`
      INSERT INTO meal_recommendations (
        user_id, bmi, bmi_category,
        calories_target, protein_target, carbs_target, fat_target,
        user_weight, user_height, user_goal,
        csv_schedule, csv_meal_plan, recommended_meals,
        meals_per_day, gender, age, activity_level,
        body_fat, diet_type, food_preference, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        bmi               = EXCLUDED.bmi,
        bmi_category      = EXCLUDED.bmi_category,
        calories_target   = EXCLUDED.calories_target,
        protein_target    = EXCLUDED.protein_target,
        carbs_target      = EXCLUDED.carbs_target,
        fat_target        = EXCLUDED.fat_target,
        user_weight       = EXCLUDED.user_weight,
        user_height       = EXCLUDED.user_height,
        user_goal         = EXCLUDED.user_goal,
        csv_schedule      = EXCLUDED.csv_schedule,
        csv_meal_plan     = EXCLUDED.csv_meal_plan,
        recommended_meals = EXCLUDED.recommended_meals,
        meals_per_day     = EXCLUDED.meals_per_day,
        gender            = EXCLUDED.gender,
        age               = EXCLUDED.age,
        activity_level    = EXCLUDED.activity_level,
        body_fat          = EXCLUDED.body_fat,
        diet_type         = EXCLUDED.diet_type,
        food_preference   = EXCLUDED.food_preference,
        updated_at        = NOW()
    `, [
      userId, bmi, bmiCategory,
      caloriesTarget, proteinTarget, carbsTarget, fatTarget,
      weightVal, heightVal, goalVal,
      csvRec.schedule, csvRec.mealPlan, JSON.stringify(recommendedMeals),
      mealsPerDay, user.gender, user.age, user.activity_level,
      user.body_fat, user.diet_type, user.food_preference
    ]);
  } catch (saveErr) {
    console.error('Failed to cache recommendations:', saveErr.message);
  }

  return {
    bmi,
    bmiCategory,
    targets: {
      calories: caloriesTarget,
      protein:  proteinTarget,
      carbs:    carbsTarget,
      fat:      fatTarget,
    },
    csvGrounding: {
      gender:   genderKey,
      goal:     goalKey,
      schedule: csvRec.schedule,
      mealPlan: csvRec.mealPlan,
    },
    recommendedMeals,
    profileIncomplete: !user.height || !user.weight,
    user: {
      gender: user.gender,
      age: user.age,
      height: user.height,
      weight: user.weight,
      body_fat: user.body_fat,
      fitness_goal: user.fitness_goal,
      activity_level: user.activity_level,
      diet_type: user.diet_type,
      food_preference: user.food_preference,
      meals_per_day: user.meals_per_day,
      target_weight: user.target_weight
    }
  };
}

/**
 * Save user nutrition settings and generate recommendations.
 */
async function saveRecommendationSettings(userId, settings) {
  const {
    gender, age, height, weight, body_fat,
    fitness_goal, activity_level, diet_type, food_preference,
    meals_per_day, target_weight
  } = settings;

  const parsedAge = age ? parseInt(age) : null;
  const parsedMeals = meals_per_day ? parseInt(meals_per_day) : 4;

  await pool.query(`
    UPDATE users
    SET
      gender = COALESCE($1, gender),
      age = COALESCE($2, age),
      height = COALESCE($3, height),
      weight = COALESCE($4, weight),
      body_fat = COALESCE($5, body_fat),
      fitness_goal = COALESCE($6, fitness_goal),
      activity_level = COALESCE($7, activity_level),
      diet_type = COALESCE($8, diet_type),
      food_preference = COALESCE($9, food_preference),
      meals_per_day = COALESCE($10, meals_per_day),
      target_weight = COALESCE($11, target_weight)
    WHERE id = $12
  `, [
    gender, parsedAge, height, weight, body_fat,
    fitness_goal, activity_level, diet_type, food_preference,
    parsedMeals, target_weight || '0', userId
  ]);

  const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (userQuery.rows.length === 0) return null;
  const user = userQuery.rows[0];

  const weightVal = user.weight || '70';
  const heightVal = user.height || '170';
  const goalVal   = user.fitness_goal || 'Maintain';

  const { bmi, bmiCategory, caloriesTarget, proteinTarget, carbsTarget, fatTarget } =
    calculateNutrientTargets(user);

  const genderKey = (user.gender || 'Male').toLowerCase().startsWith('f') ? 'female' : 'male';
  const goalRaw   = goalVal.toLowerCase();
  const goalKey   = (goalRaw.includes('burn') || goalRaw.includes('lose') || goalRaw.includes('fat') || goalRaw.includes('cut'))
    ? 'fat_burn' : 'muscle_gain';

  const csvRecommendations = await loadCsvRecommendations();
  const lookupKey = `${genderKey}|${goalKey}|${bmiCategory.toLowerCase()}`;
  const csvRec = csvRecommendations[lookupKey] || {
    schedule: 'Moderate cardio, Strength training, and 5000 steps walking',
    mealPlan: 'Balanced diet with moderate protein and carbohydrates: Chicken breast, brown rice, spinach, eggs, apple',
  };

  const targets = { caloriesTarget, proteinTarget, carbsTarget, fatTarget };
  const recommendedMeals = await generateAIDietPlan(user, targets, parsedMeals, pool);

  await pool.query(`
    INSERT INTO meal_recommendations (
      user_id, bmi, bmi_category,
      calories_target, protein_target, carbs_target, fat_target,
      user_weight, user_height, user_goal,
      csv_schedule, csv_meal_plan, recommended_meals,
      meals_per_day, gender, age, activity_level,
      body_fat, diet_type, food_preference, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      bmi               = EXCLUDED.bmi,
      bmi_category      = EXCLUDED.bmi_category,
      calories_target   = EXCLUDED.calories_target,
      protein_target    = EXCLUDED.protein_target,
      carbs_target      = EXCLUDED.carbs_target,
      fat_target        = EXCLUDED.fat_target,
      user_weight       = EXCLUDED.user_weight,
      user_height       = EXCLUDED.user_height,
      user_goal         = EXCLUDED.user_goal,
      csv_schedule      = EXCLUDED.csv_schedule,
      csv_meal_plan     = EXCLUDED.csv_meal_plan,
      recommended_meals = EXCLUDED.recommended_meals,
      meals_per_day     = EXCLUDED.meals_per_day,
      gender            = EXCLUDED.gender,
      age               = EXCLUDED.age,
      activity_level    = EXCLUDED.activity_level,
      body_fat          = EXCLUDED.body_fat,
      diet_type         = EXCLUDED.diet_type,
      food_preference   = EXCLUDED.food_preference,
      updated_at        = NOW()
  `, [
    userId, bmi, bmiCategory,
    caloriesTarget, proteinTarget, carbsTarget, fatTarget,
    weightVal, heightVal, goalVal,
    csvRec.schedule, csvRec.mealPlan, JSON.stringify(recommendedMeals),
    parsedMeals, user.gender, user.age, user.activity_level,
    user.body_fat, user.diet_type, user.food_preference
  ]);

  return {
    bmi,
    bmiCategory,
    targets: {
      calories: caloriesTarget,
      protein:  proteinTarget,
      carbs:    carbsTarget,
      fat:      fatTarget,
    },
    csvGrounding: {
      gender:   genderKey,
      goal:     goalKey,
      schedule: csvRec.schedule,
      mealPlan: csvRec.mealPlan,
    },
    recommendedMeals,
    profileIncomplete: !user.height || !user.weight,
    user: {
      gender: user.gender,
      age: user.age,
      height: user.height,
      weight: user.weight,
      body_fat: user.body_fat,
      fitness_goal: user.fitness_goal,
      activity_level: user.activity_level,
      diet_type: user.diet_type,
      food_preference: user.food_preference,
      meals_per_day: user.meals_per_day,
      target_weight: user.target_weight
    }
  };
}

/**
 * Search food database.
 */
async function searchFoodDatabase({ q = '', meal_type = '', limit = 20, offset = 0 }) {
  const lim = Math.min(parseInt(limit) || 20, 100);
  const off = parseInt(offset) || 0;
  const searchTerm = q.trim();

  if (!searchTerm || searchTerm.length < 2) {
    const params = [lim, off];
    let mealTypeFilter = '';
    if (meal_type && meal_type !== 'All') {
      params.push(meal_type);
      mealTypeFilter = `AND meal_type ILIKE $${params.length}`;
    }

    const query = `
      SELECT
        id, food_name, category, meal_type, nutrition_grade,
        serving_size, servings_unit, source_file,
        calories_kcal, protein_g, carbohydrates_g, fat_g,
        fiber_g, sugars_g, sodium_mg, saturated_fat_g,
        monounsaturated_fat_g, polyunsaturated_fat_g, trans_fat_g,
        omega3_fat_g, omega6_fat_g, cholesterol_mg,
        calcium_mg, phosphorus_mg, potassium_mg, iron_mg,
        magnesium_mg, zinc_mg, copper_mg, manganese_mg,
        selenium_ug, chromium_mg, molybdenum_mg,
        vitamin_a, vitamin_c, vitamin_d, vitamin_e, vitamin_k,
        vitamin_b12, folate_ug, biotin_ug, carotenoids_ug,
        water_g, salt_g, water_intake_ml,
        nutrition_density, image_url, image_small_url,
        1 AS relevance_rank
      FROM food_database
      WHERE calories_kcal IS NOT NULL
        AND calories_kcal > 0
        AND calories_kcal < 2000
        ${mealTypeFilter}
      ORDER BY (image_url IS NOT NULL AND image_url != '') DESC, nutrition_density DESC NULLS LAST, food_name ASC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, params);

    const countParams = [];
    let countMealFilter = '';
    if (meal_type && meal_type !== 'All') {
      countParams.push(meal_type);
      countMealFilter = `AND meal_type ILIKE $${countParams.length}`;
    }
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM food_database
       WHERE calories_kcal IS NOT NULL AND calories_kcal > 0 AND calories_kcal < 2000
         ${countMealFilter}`,
      countParams
    );

    return {
      results: result.rows.map(r => ({ ...r, food_name: cleanFoodName(r.food_name) })),
      total: parseInt(countResult.rows[0].count),
      limit: lim,
      offset: off,
      query: searchTerm,
    };
  }

  const params = [`%${searchTerm}%`, lim, off];
  let mealTypeFilter = '';
  if (meal_type && meal_type !== 'All') {
    params.push(meal_type);
    mealTypeFilter = `AND meal_type ILIKE $${params.length}`;
  }

  const query = `
    SELECT
      id, food_name, category, meal_type, nutrition_grade,
      serving_size, servings_unit, source_file,
      calories_kcal, protein_g, carbohydrates_g, fat_g,
      fiber_g, sugars_g, sodium_mg, saturated_fat_g,
      monounsaturated_fat_g, polyunsaturated_fat_g, trans_fat_g,
      omega3_fat_g, omega6_fat_g, cholesterol_mg,
      calcium_mg, phosphorus_mg, potassium_mg, iron_mg,
      magnesium_mg, zinc_mg, copper_mg, manganese_mg,
      selenium_ug, chromium_mg, molybdenum_mg,
      vitamin_a, vitamin_c, vitamin_d, vitamin_e, vitamin_k,
      vitamin_b12, folate_ug, biotin_ug, carotenoids_ug,
      water_g, salt_g, water_intake_ml,
      nutrition_density, image_url, image_small_url,
      CASE
        WHEN food_name ILIKE $1 THEN 1
        WHEN food_name ILIKE '${searchTerm}%' THEN 2
        ELSE 3
      END AS relevance_rank
    FROM food_database
    WHERE food_name ILIKE $1
      AND calories_kcal IS NOT NULL
      AND calories_kcal > 0
      AND calories_kcal < 2000
      ${mealTypeFilter}
    ORDER BY relevance_rank ASC, (image_url IS NOT NULL AND image_url != '') DESC, nutrition_density DESC NULLS LAST, food_name ASC
    LIMIT $2 OFFSET $3
  `;

  const result = await pool.query(query, params);

  const countParams = [`%${searchTerm}%`];
  let countMealFilter = '';
  if (meal_type && meal_type !== 'All') {
    countParams.push(meal_type);
    countMealFilter = `AND meal_type ILIKE $${countParams.length}`;
  }
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM food_database
     WHERE food_name ILIKE $1
       AND calories_kcal IS NOT NULL AND calories_kcal > 0 AND calories_kcal < 2000
       ${countMealFilter}`,
    countParams
  );

  return {
    results: result.rows.map(r => ({ ...r, food_name: cleanFoodName(r.food_name) })),
    total: parseInt(countResult.rows[0].count),
    limit: lim,
    offset: off,
    query: searchTerm,
  };
}

/**
 * Update recommended meals list in database.
 */
async function updateRecommendedMealsList(userId, recommendedMeals) {
  const result = await pool.query(
    `UPDATE meal_recommendations
     SET recommended_meals = $1, updated_at = NOW()
     WHERE user_id = $2
     RETURNING *`,
    [JSON.stringify(recommendedMeals), userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].recommended_meals;
}

/**
 * Delete a meal by ID.
 */
async function deleteMeal(userId, mealId) {
  const result = await pool.query(
    'DELETE FROM meals WHERE id = $1 AND user_id = $2 RETURNING *',
    [parseInt(mealId), userId]
  );
  return result.rows.length > 0;
}

/**
 * Find food alternatives with similar macros.
 */
async function getFoodAlternatives({ p = 0, c = 0, f = 0, exclude_name = '', limit = 20 }) {
  const lim = Math.min(parseInt(limit) || 20, 50);
  const targetProtein = parseFloat(p) || 0;
  const targetCarbs = parseFloat(c) || 0;
  const targetFat = parseFloat(f) || 0;
  const totalMacros = targetProtein + targetCarbs + targetFat;

  if (totalMacros === 0) {
    const result = await pool.query(
      `SELECT
        id, food_name, category, meal_type, nutrition_grade, serving_size,
        calories_kcal, protein_g, carbohydrates_g, fat_g, fiber_g,
        sugars_g, sodium_mg, saturated_fat_g, nutrition_density, image_url, image_small_url
       FROM food_database
       WHERE calories_kcal > 0 AND (image_url IS NOT NULL AND image_url != '')
         AND food_name NOT ILIKE $1
       ORDER BY nutrition_density DESC NULLS LAST, food_name ASC
       LIMIT $2`,
      [`%${exclude_name}%`, lim]
    );
    return {
      results: result.rows.map(r => ({ ...r, food_name: cleanFoodName(r.food_name) }))
    };
  }

  const pctProtein = targetProtein / totalMacros;
  const pctCarbs = targetCarbs / totalMacros;
  const pctFat = targetFat / totalMacros;

  const query = `
    WITH valid_foods AS (
      SELECT
        id, food_name, category, meal_type, nutrition_grade, serving_size,
        calories_kcal, protein_g, carbohydrates_g, fat_g, fiber_g,
        sugars_g, sodium_mg, saturated_fat_g, nutrition_density, image_url, image_small_url,
        (COALESCE(protein_g, 0) + COALESCE(carbohydrates_g, 0) + COALESCE(fat_g, 0)) AS total_macros
      FROM food_database
      WHERE calories_kcal > 0 
        AND (COALESCE(protein_g, 0) + COALESCE(carbohydrates_g, 0) + COALESCE(fat_g, 0)) > 0
        AND (image_url IS NOT NULL AND image_url != '')
    )
    SELECT 
      id, food_name, category, meal_type, nutrition_grade, serving_size,
      calories_kcal, protein_g, carbohydrates_g, fat_g, fiber_g,
      sugars_g, sodium_mg, saturated_fat_g, nutrition_density, image_url, image_small_url,
      (
        ABS((COALESCE(protein_g, 0) / total_macros) - $1) + 
        ABS((COALESCE(carbohydrates_g, 0) / total_macros) - $2) + 
        ABS((COALESCE(fat_g, 0) / total_macros) - $3)
      ) AS distance
    FROM valid_foods
    WHERE food_name NOT ILIKE $4
    ORDER BY distance ASC, nutrition_density DESC NULLS LAST
    LIMIT $5;
  `;

  const result = await pool.query(query, [pctProtein, pctCarbs, pctFat, `%${exclude_name}%`, lim]);
  return {
    results: result.rows.map(r => ({ ...r, food_name: cleanFoodName(r.food_name) }))
  };
}

/**
 * Browse food database with range filters and dynamic sorting.
 */
async function browseFoodDatabase(params) {
  let {
    q = '',
    sort_by = 'nutrition_density',
    sort_order = 'desc',
    limit = 50,
    offset = 0,
    min_calories, max_calories,
    min_protein, max_protein,
    min_carbs, max_carbs,
    min_fat, max_fat,
    min_fiber, max_fiber,
    min_sugar, max_sugar,
    min_sodium, max_sodium,
    min_saturated_fat, max_saturated_fat,
    min_cholesterol, max_cholesterol,
    min_calcium, max_calcium,
    min_iron, max_iron,
    min_magnesium, max_magnesium,
    min_potassium, max_potassium,
    min_zinc, max_zinc,
    min_vitamin_c, max_vitamin_c,
    min_vitamin_d, max_vitamin_d,
  } = params;

  const lim = Math.min(parseInt(limit) || 50, 200);
  const off = parseInt(offset) || 0;

  const allowedSortColumns = [
    'nutrition_density', 'calories_kcal', 'protein_g', 'carbohydrates_g',
    'fat_g', 'fiber_g', 'sugars_g', 'sodium_mg', 'saturated_fat_g',
    'monounsaturated_fat_g', 'polyunsaturated_fat_g', 'trans_fat_g',
    'omega3_fat_g', 'omega6_fat_g', 'cholesterol_mg',
    'calcium_mg', 'phosphorus_mg', 'potassium_mg', 'iron_mg',
    'magnesium_mg', 'zinc_mg', 'copper_mg', 'manganese_mg',
    'selenium_ug', 'chromium_mg', 'molybdenum_mg',
    'vitamin_a', 'vitamin_c', 'vitamin_d', 'vitamin_e', 'vitamin_k',
    'vitamin_b12', 'folate_ug', 'biotin_ug', 'carotenoids_ug',
    'food_name'
  ];
  const column = allowedSortColumns.includes(sort_by) ? sort_by : 'nutrition_density';
  const order = sort_order === 'asc' ? 'ASC' : 'DESC';

  const conditions = [
    'calories_kcal IS NOT NULL',
    'calories_kcal > 0',
  ];
  const queryParams = [];

  if (q && q.trim().length >= 2) {
    queryParams.push(`%${q.trim()}%`);
    conditions.push(`food_name ILIKE $${queryParams.length}`);
  }

  const ranges = [
    { min: min_calories, max: max_calories, col: 'calories_kcal' },
    { min: min_protein, max: max_protein, col: 'protein_g' },
    { min: min_carbs, max: max_carbs, col: 'carbohydrates_g' },
    { min: min_fat, max: max_fat, col: 'fat_g' },
    { min: min_fiber, max: max_fiber, col: 'fiber_g' },
    { min: min_sugar, max: max_sugar, col: 'sugars_g' },
    { min: min_sodium, max: max_sodium, col: 'sodium_mg' },
    { min: min_saturated_fat, max: max_saturated_fat, col: 'saturated_fat_g' },
    { min: min_cholesterol, max: max_cholesterol, col: 'cholesterol_mg' },
    { min: min_calcium, max: max_calcium, col: 'calcium_mg' },
    { min: min_iron, max: max_iron, col: 'iron_mg' },
    { min: min_magnesium, max: max_magnesium, col: 'magnesium_mg' },
    { min: min_potassium, max: max_potassium, col: 'potassium_mg' },
    { min: min_zinc, max: max_zinc, col: 'zinc_mg' },
    { min: min_vitamin_c, max: max_vitamin_c, col: 'vitamin_c' },
    { min: min_vitamin_d, max: max_vitamin_d, col: 'vitamin_d' },
  ];

  for (const r of ranges) {
    if (r.min !== undefined && r.min !== '') {
      queryParams.push(parseFloat(r.min));
      conditions.push(`${r.col} >= $${queryParams.length}`);
    }
    if (r.max !== undefined && r.max !== '') {
      queryParams.push(parseFloat(r.max));
      conditions.push(`${r.col} <= $${queryParams.length}`);
    }
  }

  queryParams.push(lim, off);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeSortCol = /^[a-z_]+$/.test(column) ? column : 'nutrition_density';

  const query = `
    SELECT
      id, food_name, category, meal_type, nutrition_grade,
      serving_size, servings_unit, source_file,
      calories_kcal, protein_g, carbohydrates_g, fat_g,
      fiber_g, sugars_g, sodium_mg, saturated_fat_g,
      monounsaturated_fat_g, polyunsaturated_fat_g, trans_fat_g,
      omega3_fat_g, omega6_fat_g, cholesterol_mg,
      calcium_mg, phosphorus_mg, potassium_mg, iron_mg,
      magnesium_mg, zinc_mg, copper_mg, manganese_mg,
      selenium_ug, chromium_mg, molybdenum_mg,
      vitamin_a, vitamin_c, vitamin_d, vitamin_e, vitamin_k,
      vitamin_b12, folate_ug, biotin_ug, carotenoids_ug,
      water_g, salt_g, water_intake_ml,
      nutrition_density, image_url, image_small_url
    FROM food_database
    ${whereClause}
    ORDER BY ${safeSortCol} ${order} NULLS LAST, (image_url IS NOT NULL AND image_url != '') DESC, food_name ASC
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const result = await pool.query(query, queryParams);

  const countParams = queryParams.slice(0, queryParams.length - 2);
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM food_database ${whereClause}`,
    countParams
  );

  return {
    results: result.rows.map(r => ({ ...r, food_name: cleanFoodName(r.food_name) })),
    total: parseInt(countResult.rows[0].count),
    limit: lim,
    offset: off,
    sort_by: column,
    sort_order: order,
  };
}

module.exports = {
  cleanFoodName,
  analyzeMealPhoto,
  saveMeal,
  updateMeal,
  getUserMeals,
  getMealRecommendations,
  saveRecommendationSettings,
  searchFoodDatabase,
  updateRecommendedMealsList,
  deleteMeal,
  getFoodAlternatives,
  browseFoodDatabase,
};
