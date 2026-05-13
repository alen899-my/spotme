const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const upload = require('../uploadConfig');
const { callAI } = require('../utils/ai');

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
You are a registered dietitian and expert food analyst with deep knowledge of the USDA FoodData Central database.

Carefully examine the image provided and identify every food and drink item visible.

${description ? `The user added this note about the meal: "${description}"` : ''}

STEP 1 — IDENTIFY:
List every distinct food item you can see, including sauces, oils, garnishes, and beverages.

STEP 2 — ESTIMATE PORTIONS:
For each item, estimate the real-world portion size using visual anchors:
- Compare to known objects (fist = ~1 cup, palm = ~3oz protein, thumb = ~1 tbsp)
- Include estimated weight in grams, e.g. "1 cup cooked (185g)"

STEP 3 — LOOK UP NUTRITION:
Use USDA FoodData Central values for each item at the estimated portion:
- Be precise: use realistic figures like 143 kcal, 6.3g protein — do NOT round everything to multiples of 5 or 10
- Account for cooking method (fried adds fat, boiled does not)
- Oils/sauces/dressings add meaningful calories — always include them

ACCURACY RULES:
- Specific food names only: "white rice, cooked" not "rice", "chicken breast, grilled" not "chicken"
- If a food is partially obscured, make a conservative estimate
- All numeric fields must be numbers, never null or strings
- Sodium is in milligrams, everything else in grams, calories in kcal

Return ONLY the following JSON with no extra text before or after:
{
  "items": [
    {
      "item_name": "precise USDA-style food name",
      "quantity": "portion with weight e.g. 1 cup (185g)",
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

    await client.query('COMMIT');
    res.status(201).json(mealResult.rows[0]);
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
