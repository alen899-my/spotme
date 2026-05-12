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
      Identify the food in this image and provide nutritional info.
      ${description ? `User says: "${description}"` : ''}

      Return ONLY this JSON format:
      {
        "items": [
          {
            "item_name": "name", 
            "quantity": "estimated amount", 
            "calories": number, 
            "protein": number, 
            "carbs": number, 
            "fat": number,
            "fiber": number,
            "sugar": number,
            "sodium": number,
            "saturated_fat": number,
            "cholesterol": number
          }
        ],
        "total_calories": number,
        "total_protein": number,
        "total_carbs": number,
        "total_fat": number,
        "total_fiber": number,
        "total_sugar": number,
        "total_sodium": number,
        "total_saturated_fat": number,
        "total_cholesterol": number
      }
    `;

    const aiResponse = await callAI(prompt, imageUrl);
    
    // Extract JSON from AI response (handle potential markdown formatting)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse AI response');
    
    const analysis = JSON.parse(jsonMatch[0]);

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

    // Fetch items for each meal
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
