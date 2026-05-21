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
        cached.user_goal   === goalVal
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
        });
      }
    }

    // ── 2. Calculate nutrient targets via Mifflin-St Jeor ───────────────────
    const { loadCsvRecommendations, calculateNutrientTargets } = require('../utils/recommendations');
    const { bmi, bmiCategory, caloriesTarget, proteinTarget, carbsTarget, fatTarget } =
      calculateNutrientTargets({ ...user, weight: weightVal, height: heightVal, fitness_goal: goalVal });

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

    // ── 4. Curated meal plans keyed by BMI category ──────────────────────────
    const mealPlans = {
      'Underweight': [
        {
          meal_type: 'Breakfast',
          title: 'Peanut Butter & Banana Oat Toast',
          description: 'A calorie-dense breakfast with healthy fats and complex carbs to support weight gain.',
          instructions: 'Toast 2 slices of whole wheat bread, spread 2 tbsp of peanut butter, top with sliced banana and a drizzle of honey.',
          calories: 550, protein: 22, carbs: 65, fat: 24,
          ingredients: [
            { name: 'Whole wheat bread',  quantity: '2 slices' },
            { name: 'Peanut butter',      quantity: '2 tbsp (32g)' },
            { name: 'Banana',             quantity: '1 medium' },
            { name: 'Honey',              quantity: '1 tsp' },
          ],
        },
        {
          meal_type: 'Lunch',
          title: 'High-Protein Chicken & Sweet Potato Bowl',
          description: 'High-protein lunch with robust complex carbohydrates for healthy weight gain.',
          instructions: 'Roast sweet potato cubes at 200°C for 25 mins. Grill chicken breast and serve over fresh spinach with olive oil and pumpkin seeds.',
          calories: 800, protein: 48, carbs: 90, fat: 26,
          ingredients: [
            { name: 'Grilled Chicken Breast', quantity: '200g' },
            { name: 'Roasted Sweet Potato',   quantity: '300g' },
            { name: 'Fresh Spinach',           quantity: '50g' },
            { name: 'Olive Oil',               quantity: '1 tbsp' },
            { name: 'Pumpkin seeds',           quantity: '20g' },
          ],
        },
        {
          meal_type: 'Dinner',
          title: 'Creamy Salmon Quinoa Pasta',
          description: 'Calorie-rich dinner packed with Omega-3 fats and high-quality protein.',
          instructions: 'Cook pasta al dente. Toss with grilled salmon chunks, basil pesto sauce, and cooked quinoa.',
          calories: 850, protein: 50, carbs: 85, fat: 34,
          ingredients: [
            { name: 'Salmon Fillet',   quantity: '180g' },
            { name: 'Quinoa Pasta',    quantity: '100g raw' },
            { name: 'Basil Pesto',     quantity: '2 tbsp' },
            { name: 'Quinoa cooked',   quantity: '50g' },
          ],
        },
        {
          meal_type: 'Snack',
          title: 'Creamy Avocado & Berry Shake',
          description: 'Energy-dense shake rich in healthy fats and protein for between-meal calories.',
          instructions: 'Blend whole milk, 1 scoop whey protein, half an avocado, and mixed berries until smooth.',
          calories: 500, protein: 30, carbs: 45, fat: 22,
          ingredients: [
            { name: 'Whole Milk',          quantity: '300ml' },
            { name: 'Whey Protein Powder', quantity: '1 scoop (30g)' },
            { name: 'Avocado',             quantity: '1/2 medium' },
            { name: 'Mixed Berries',       quantity: '50g' },
          ],
        },
      ],

      'Normal weight': [
        {
          meal_type: 'Breakfast',
          title: 'Spinach & Feta Egg Scramble with Apple',
          description: 'A perfectly balanced high-protein start to the day.',
          instructions: 'Scramble 3 eggs with fresh spinach and crumbled feta in a lightly oiled pan. Serve with a crisp sliced apple.',
          calories: 450, protein: 24, carbs: 40, fat: 20,
          ingredients: [
            { name: 'Whole Eggs',    quantity: '3 large' },
            { name: 'Fresh Spinach', quantity: '50g' },
            { name: 'Feta Cheese',   quantity: '30g' },
            { name: 'Apple',         quantity: '1 medium' },
          ],
        },
        {
          meal_type: 'Lunch',
          title: 'Balanced Chicken, Brown Rice & Spinach Bowl',
          description: 'Clean muscle builder featuring lean protein and fiber-rich whole grains.',
          instructions: 'Grill chicken breast, boil brown rice, steam spinach. Season with fresh lemon juice and black pepper.',
          calories: 600, protein: 42, carbs: 65, fat: 16,
          ingredients: [
            { name: 'Chicken Breast', quantity: '150g' },
            { name: 'Brown Rice',     quantity: '150g cooked' },
            { name: 'Spinach',        quantity: '80g' },
            { name: 'Olive Oil',      quantity: '2 tsp' },
          ],
        },
        {
          meal_type: 'Dinner',
          title: 'Baked Salmon with Quinoa & Steamed Broccoli',
          description: 'A perfect recovery dinner with complex carbs and Omega-3 fatty acids.',
          instructions: 'Bake salmon fillet at 200°C for 15 mins. Serve alongside boiled quinoa and steamed broccoli.',
          calories: 650, protein: 38, carbs: 55, fat: 24,
          ingredients: [
            { name: 'Salmon Fillet', quantity: '150g' },
            { name: 'Quinoa',        quantity: '120g cooked' },
            { name: 'Broccoli',      quantity: '100g' },
          ],
        },
        {
          meal_type: 'Snack',
          title: 'Greek Yogurt with Almonds & Berries',
          description: 'High-protein, low-glycemic snack to keep you fuelled between meals.',
          instructions: 'Combine plain greek yogurt with a handful of fresh blueberries and raw almonds. Serve chilled.',
          calories: 300, protein: 18, carbs: 25, fat: 12,
          ingredients: [
            { name: 'Greek Yogurt', quantity: '200g' },
            { name: 'Blueberries',  quantity: '50g' },
            { name: 'Almonds',      quantity: '15g' },
          ],
        },
      ],

      'Overweight': [
        {
          meal_type: 'Breakfast',
          title: 'Avocado, Salmon & Egg Plate',
          description: 'Low-carb breakfast providing sustained energy and high satiety to support fat loss.',
          instructions: 'Boil 2 eggs to desired doneness. Plate with sliced avocado and smoked salmon. Finish with chili flakes.',
          calories: 400, protein: 22, carbs: 12, fat: 28,
          ingredients: [
            { name: 'Whole Eggs',    quantity: '2 large' },
            { name: 'Smoked Salmon', quantity: '60g' },
            { name: 'Avocado',       quantity: '1/2 medium' },
          ],
        },
        {
          meal_type: 'Lunch',
          title: 'Grilled Fish & Broccoli Medley',
          description: 'Lean high-fiber, low-carb meal designed to accelerate fat burning.',
          instructions: 'Pan-sear white fish in avocado oil. Steam broccoli and toss with leafy greens and toasted almonds.',
          calories: 550, protein: 36, carbs: 15, fat: 38,
          ingredients: [
            { name: 'White Fish (e.g. Cod)', quantity: '180g' },
            { name: 'Broccoli',              quantity: '150g' },
            { name: 'Almonds',               quantity: '20g' },
            { name: 'Avocado Oil',            quantity: '1.5 tbsp' },
          ],
        },
        {
          meal_type: 'Dinner',
          title: 'Beef Stir-Fry with Leafy Greens & Peppers',
          description: 'Satisfying low-glycemic dinner loaded with micronutrients and lean protein.',
          instructions: 'Stir fry lean beef strips with sliced bell peppers, baby spinach, and minced garlic in sesame oil. Serve immediately.',
          calories: 500, protein: 40, carbs: 18, fat: 28,
          ingredients: [
            { name: 'Lean Beef Strips', quantity: '150g' },
            { name: 'Bell Pepper',      quantity: '1 medium' },
            { name: 'Spinach',          quantity: '100g' },
            { name: 'Sesame Oil',       quantity: '1 tbsp' },
          ],
        },
        {
          meal_type: 'Snack',
          title: 'Cucumber & Hummus Snack Cup',
          description: 'Crisp low-carb veggies with healthy sesame fats for a guilt-free snack.',
          instructions: 'Slice 1 large cucumber into sticks. Serve alongside creamy hummus for dipping.',
          calories: 250, protein: 8, carbs: 14, fat: 18,
          ingredients: [
            { name: 'Cucumber', quantity: '1 large' },
            { name: 'Hummus',   quantity: '4 tbsp (60g)' },
          ],
        },
      ],

      'Obesity': [
        {
          meal_type: 'Breakfast',
          title: 'Tomato & Herb Veggie Omelet',
          description: 'Very low-calorie, nutrient-dense breakfast to support portion control and satiety.',
          instructions: 'Whisk 3 egg whites with 1 whole egg. Cook on a non-stick pan with diced tomatoes, fresh spinach, and herbs.',
          calories: 250, protein: 18, carbs: 10, fat: 6,
          ingredients: [
            { name: 'Egg Whites',  quantity: '3 large' },
            { name: 'Whole Egg',   quantity: '1 large' },
            { name: 'Tomatoes',    quantity: '50g' },
            { name: 'Fresh Herbs', quantity: 'to taste' },
          ],
        },
        {
          meal_type: 'Lunch',
          title: 'Greek Yogurt & Roasted Salmon Salad',
          description: 'A portion-controlled salad with lean fats and fresh vegetables.',
          instructions: 'Bake salmon at 200°C for 12 mins. Serve over a bed of leafy greens drizzled with a Greek yogurt-lemon dressing.',
          calories: 400, protein: 38, carbs: 15, fat: 18,
          ingredients: [
            { name: 'Baked Salmon',         quantity: '120g' },
            { name: 'Leafy Greens',          quantity: '100g' },
            { name: 'Greek Yogurt (plain)',  quantity: '50g' },
            { name: 'Lemon Juice',           quantity: '1 tbsp' },
          ],
        },
        {
          meal_type: 'Dinner',
          title: 'Baked Cod, Steamed Broccoli & Carrot Stick Platter',
          description: 'Very lean dinner with maximum nutrient density and minimal calories.',
          instructions: 'Season and bake cod at 200°C for 15 mins. Steam broccoli and plate with raw carrot sticks.',
          calories: 350, protein: 30, carbs: 25, fat: 8,
          ingredients: [
            { name: 'Cod Fillet',       quantity: '150g' },
            { name: 'Steamed Broccoli', quantity: '120g' },
            { name: 'Carrot Sticks',    quantity: '80g' },
          ],
        },
        {
          meal_type: 'Snack',
          title: 'Greek Yogurt & Almond Bowl',
          description: 'Nutrient-dense, portion-controlled snack to bridge meals without excess calories.',
          instructions: 'Mix low-fat plain greek yogurt with a small handful of chopped almonds and mixed nuts.',
          calories: 150, protein: 12, carbs: 12, fat: 2,
          ingredients: [
            { name: 'Plain Greek Yogurt (0% fat)', quantity: '150g' },
            { name: 'Mixed Nuts & Almonds',        quantity: '10g' },
          ],
        },
      ],
    };

    const recommendedMeals = mealPlans[bmiCategory] || mealPlans['Normal weight'];

    // ── 5. Persist to user-specific cache ────────────────────────────────────
    try {
      await pool.query(`
        INSERT INTO meal_recommendations (
          user_id, bmi, bmi_category,
          calories_target, protein_target, carbs_target, fat_target,
          user_weight, user_height, user_goal,
          csv_schedule, csv_meal_plan, recommended_meals, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
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
          updated_at        = NOW()
      `, [
        req.user.id, bmi, bmiCategory,
        caloriesTarget, proteinTarget, carbsTarget, fatTarget,
        weightVal, heightVal, goalVal,
        csvRec.schedule, csvRec.mealPlan, JSON.stringify(recommendedMeals),
      ]);
    } catch (saveErr) {
      console.error('Failed to cache recommendations:', saveErr.message);
      // Non-fatal — still return the response below
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
    });

  } catch (err) {
    console.error('Error generating recommendations:', err);
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
