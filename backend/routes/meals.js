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
