const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const upload = require('../uploadConfig');
const { callAI } = require('../utils/ai');
const { awardXP, XP_VALUES } = require('../utils/xp');

// ── POST /meals/analyze — Analyze meal image using AI ────────────────────────
router.post('/analyze', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const { description } = req.body;

    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL.endsWith('/')
      ? process.env.CLOUDFLARE_R2_PUBLIC_URL.slice(0, -1)
      : process.env.CLOUDFLARE_R2_PUBLIC_URL;

    const imageUrl = `${publicUrl}/${req.file.key}`;

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

    const aiResponse = await callAI(prompt, imageUrl);

    // Robust JSON extraction — try fenced block first, then bare { ... }
    const fencedMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const bareMatch = aiResponse.match(/\{[\s\S]*\}/);
    const jsonString = fencedMatch ? fencedMatch[1].trim() : bareMatch ? bareMatch[0] : null;

    if (!jsonString) throw new Error('Failed to locate JSON in AI response');

    let analysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch {
      throw new Error('Failed to parse JSON from AI response');
    }

    // Auto-correct totals if they drift from the sum of items (>5% difference)
    if (Array.isArray(analysis.items) && analysis.items.length > 0) {
      const fields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'saturated_fat', 'cholesterol'];
      for (const field of fields) {
        const sum = analysis.items.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
        const modelTotal = Number(analysis[`total_${field}`]);
        if (Math.abs(sum - modelTotal) / (modelTotal || 1) > 0.05) {
          analysis[`total_${field}`] = Math.round(sum * 10) / 10;
        }
      }
    }

    res.json({ imageUrl, analysis });
  } catch (err) {
    console.error('Meal analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /meals — Save a meal ────────────────────────────────────────────────
router.post('/', authenticateToken, validate(schemas.meal), async (req, res) => {
  const {
    image_url, meal_type,
    total_calories, total_protein, total_carbs, total_fat,
    total_fiber, total_sugar, total_sodium, total_saturated_fat, total_cholesterol,
    items
  } = req.body;
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
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() AT TIME ZONE 'UTC') RETURNING *`,
      [
        req.user.id, image_url, meal_type,
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

    // Award XP for logging a meal
    const awardRes = await awardXP(client, req.user.id, XP_VALUES.LOG_MEAL, 'Logged a meal');

    await client.query('COMMIT');
    res.status(201).json({
      ...mealResult.rows[0],
      xp_awarded: XP_VALUES.LOG_MEAL,
      new_tier: awardRes.tier,
      leveled_up: awardRes.leveledUp
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving meal:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── GET /meals — List user meals ─────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const meals = await pool.query(
      `SELECT * FROM meals WHERE user_id = $1 ORDER BY logged_at DESC`,
      [req.user.id]
    );

    const results = [];
    for (const meal of meals.rows) {
      const items = await pool.query(
        'SELECT * FROM meal_items WHERE meal_id = $1',
        [meal.id]
      );
      results.push({ ...meal, items: items.rows });
    }

    res.json(results);
  } catch (err) {
    console.error('Error fetching meals:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /meals/recommendation — Meal recommendations based on profile & GYM dataset ──
// ── GET /meals/recommendation ────────────────────────────────────────────────
router.get('/recommendation', authenticateToken, async (req, res) => {
  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userQuery.rows[0];

    const weightVal = user.weight || '70';
    const heightVal = user.height || '170';
    const goalVal   = user.fitness_goal || 'Maintain';

    // ── 1. Serve from cache if profile hasn't changed ────────────────────────
    const cachedQuery = await pool.query(
      'SELECT * FROM meal_recommendations WHERE user_id = $1',
      [req.user.id]
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
        return res.json({
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
            meals_per_day: user.meals_per_day
          }
        });
      }
    }

    // ── 2. Calculate nutrient targets via scientific calculations ────────────
    const { loadCsvRecommendations, calculateNutrientTargets, generateDynamicMealPlan } = require('../utils/recommendations');
    const { bmi, bmiCategory, caloriesTarget, proteinTarget, carbsTarget, fatTarget } =
      calculateNutrientTargets(user);

    // ── 3. Map gender & goal, load GYM dataset alignment from DB ────────────
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

    // ── 4. Generate dynamic scaled meals using scientific calorie/macro targets ──
    const mealsPerDay = user.meals_per_day || 4;
    const recommendedMeals = generateDynamicMealPlan(
      user,
      caloriesTarget,
      proteinTarget,
      carbsTarget,
      fatTarget,
      mealsPerDay
    );

    // ── 5. Persist to user-specific cache ────────────────────────────────────
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
        req.user.id, bmi, bmiCategory,
        caloriesTarget, proteinTarget, carbsTarget, fatTarget,
        weightVal, heightVal, goalVal,
        csvRec.schedule, csvRec.mealPlan, JSON.stringify(recommendedMeals),
        mealsPerDay, user.gender, user.age, user.activity_level,
        user.body_fat, user.diet_type, user.food_preference
      ]);
    } catch (saveErr) {
      console.error('Failed to cache recommendations:', saveErr.message);
    }

    // ── 6. Return ─────────────────────────────────────────────────────────────
    res.json({
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
        meals_per_day: user.meals_per_day
      }
    });

  } catch (err) {
    console.error('Error generating recommendations:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /meals/recommendation ───────────────────────────────────────────────
router.post('/recommendation', authenticateToken, async (req, res) => {
  try {
    const {
      gender, age, height, weight, body_fat,
      fitness_goal, activity_level, diet_type, food_preference,
      meals_per_day
    } = req.body;

    const parsedAge = age ? parseInt(age) : null;
    const parsedMeals = meals_per_day ? parseInt(meals_per_day) : 4;

    // 1. Update the user's permanent profile in the users table
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
        meals_per_day = COALESCE($10, meals_per_day)
      WHERE id = $11
    `, [
      gender, parsedAge, height, weight, body_fat,
      fitness_goal, activity_level, diet_type, food_preference,
      parsedMeals, req.user.id
    ]);

    // 2. Fetch the updated user profile
    const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userQuery.rows[0];

    const weightVal = user.weight || '70';
    const heightVal = user.height || '170';
    const goalVal   = user.fitness_goal || 'Maintain';

    // 3. Calculate scientific targets
    const { loadCsvRecommendations, calculateNutrientTargets, generateDynamicMealPlan } = require('../utils/recommendations');
    const { bmi, bmiCategory, caloriesTarget, proteinTarget, carbsTarget, fatTarget } =
      calculateNutrientTargets(user);

    // 4. Match GYM.csv dataset alignment
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

    // 5. Generate dynamic scaled meals
    const recommendedMeals = generateDynamicMealPlan(
      user,
      caloriesTarget,
      proteinTarget,
      carbsTarget,
      fatTarget,
      parsedMeals
    );

    // 6. Cache to meal_recommendations database table
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
      req.user.id, bmi, bmiCategory,
      caloriesTarget, proteinTarget, carbsTarget, fatTarget,
      weightVal, heightVal, goalVal,
      csvRec.schedule, csvRec.mealPlan, JSON.stringify(recommendedMeals),
      parsedMeals, user.gender, user.age, user.activity_level,
      user.body_fat, user.diet_type, user.food_preference
    ]);

    // 7. Return response
    res.json({
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
        meals_per_day: user.meals_per_day
      }
    });

  } catch (err) {
    console.error('Error saving recommendation settings:', err);
    res.status(500).json({ error: err.message });
  }
});

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
  try { decoded = decodeURIComponent(escape(decoded)); } catch (e) {}
  decoded = decoded.replace(/\\"/g, '"').replace(/\\'/g, "'");
  decoded = decoded.replace(/["*]/g, '');
  decoded = decoded.replace(/^['\s,\-]+|['\s,\-]+$/g, '');
  decoded = decoded.replace(/\s+/g, ' ');
  return decoded.trim();
}

// ── GET /meals/food-search — Search the 300k food database ───────────────────
router.get('/food-search', authenticateToken, async (req, res) => {
  try {
    const { q = '', meal_type = '', limit = 20, offset = 0 } = req.query;
    const lim = Math.min(parseInt(limit) || 20, 100); // cap at 100
    const off = parseInt(offset) || 0;

    const searchTerm = q.trim();

    if (!searchTerm || searchTerm.length < 2) {
      // Return 100 default items, prioritizing those with images
      const params = [lim, off];
      let mealTypeFilter = '';
      if (meal_type && meal_type !== 'All') {
        params.push(meal_type);
        mealTypeFilter = `AND meal_type ILIKE $${params.length}`;
      }

      const query = `
        SELECT
          id,
          food_name,
          category,
          meal_type,
          nutrition_grade,
          serving_size,
          source_file,
          calories_kcal,
          protein_g,
          carbohydrates_g,
          fat_g,
          fiber_g,
          sugars_g,
          sodium_mg,
          saturated_fat_g,
          nutrition_density,
          image_url,
          image_small_url,
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

      return res.json({
        results: result.rows.map(r => ({ ...r, food_name: cleanFoodName(r.food_name) })),
        total: parseInt(countResult.rows[0].count),
        limit: lim,
        offset: off,
        query: searchTerm,
      });
    }

    // Build dynamic query with optional meal_type filter for active search
    const params = [`%${searchTerm}%`, lim, off];
    let mealTypeFilter = '';
    if (meal_type && meal_type !== 'All') {
      params.push(meal_type);
      mealTypeFilter = `AND meal_type ILIKE $${params.length}`;
    }

    const query = `
      SELECT
        id,
        food_name,
        category,
        meal_type,
        nutrition_grade,
        serving_size,
        source_file,
        calories_kcal,
        protein_g,
        carbohydrates_g,
        fat_g,
        fiber_g,
        sugars_g,
        sodium_mg,
        saturated_fat_g,
        nutrition_density,
        image_url,
        image_small_url,
        -- Relevance ranking: exact match = 1, prefix = 2, contains = 3
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

    // Count total matches for pagination
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

    res.json({
      results: result.rows.map(r => ({ ...r, food_name: cleanFoodName(r.food_name) })),
      total: parseInt(countResult.rows[0].count),
      limit: lim,
      offset: off,
      query: searchTerm,
    });
  } catch (err) {
    console.error('Food search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /meals/recommendation/meals — Update recommended meals list ──────────
router.put('/recommendation/meals', authenticateToken, async (req, res) => {
  try {
    const { recommendedMeals } = req.body;
    if (!recommendedMeals || !Array.isArray(recommendedMeals)) {
      return res.status(400).json({ error: 'recommendedMeals array is required' });
    }

    // Update the JSONB recommended_meals column
    const result = await pool.query(
      `UPDATE meal_recommendations
       SET recommended_meals = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [JSON.stringify(recommendedMeals), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No cached meal recommendations found for this user.' });
    }

    res.json({ success: true, recommendedMeals: result.rows[0].recommended_meals });
  } catch (err) {
    console.error('Error updating recommended meals:', err);
    res.status(500).json({ error: err.message });
  }
});


// ── DELETE /meals/:id — Delete a meal ────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM meals WHERE id = $1 AND user_id = $2 RETURNING *',
      [parseInt(req.params.id), req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meal not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting meal:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
