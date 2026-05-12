require('dotenv').config({ path: __dirname + '/.env' });
const { pool } = require('./db');

async function migrate() {
  try {
    console.log('Adding detailed nutrient columns to meals and meal_items...');
    
    await pool.query(`
      -- Update meals table
      ALTER TABLE meals 
      ADD COLUMN IF NOT EXISTS total_fiber FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_sugar FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_sodium FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_saturated_fat FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_cholesterol FLOAT DEFAULT 0;

      -- Update meal_items table
      ALTER TABLE meal_items 
      ADD COLUMN IF NOT EXISTS fiber FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sugar FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sodium FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS saturated_fat FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cholesterol FLOAT DEFAULT 0;
    `);

    console.log('Detailed nutrient columns added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
