const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { pool } = require('../db');
const { generateAIDietPlan } = require('../utils/dietPlanGenerator');

async function test() {
  try {
    console.log('1. Checking database connection and food_database count...');
    const countRes = await pool.query('SELECT COUNT(*) FROM food_database');
    console.log(`food_database row count: ${countRes.rows[0].count}`);

    if (parseInt(countRes.rows[0].count) === 0) {
      console.log('WARNING: food_database is empty!');
    } else {
      const sample = await pool.query('SELECT food_name, category, meal_type, calories_kcal, protein_g, carbohydrates_g, fat_g, image_url FROM food_database LIMIT 3');
      console.log('Sample rows:', sample.rows);
    }

    console.log('\n2. Testing full generation pipeline...');
    const mockUser = {
      gender: 'Male',
      age: 28,
      height: '180',
      weight: '80',
      fitness_goal: 'Gain Muscle',
      activity_level: 'Moderately Active',
      diet_type: 'Standard',
      food_preference: 'likes peanut butter, oats, eggs, chicken breast, rice',
      meals_per_day: 4
    };

    const mockTargets = {
      caloriesTarget: 2800,
      proteinTarget: 180,
      carbsTarget: 320,
      fatTarget: 90
    };

    const plan = await generateAIDietPlan(mockUser, mockTargets, mockUser.meals_per_day, pool);
    console.log('\nSUCCESS: Generated plan has length:', plan?.length);
    if (plan && plan.length > 0) {
      console.log('Sample meal:', JSON.stringify(plan[0], null, 2));
    }
  } catch (err) {
    console.error('CRITICAL ERROR:', err);
  } finally {
    await pool.end();
  }
}

test();
