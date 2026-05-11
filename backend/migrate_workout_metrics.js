require('dotenv').config();
const { pool } = require('./db');

async function migrate() {
  try {
    console.log('Adding water_intake and post_weight columns...');
    await pool.query(`
      ALTER TABLE daily_workouts 
      ADD COLUMN IF NOT EXISTS water_intake_liters NUMERIC(4,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS post_workout_weight NUMERIC(5,2) DEFAULT 0
    `);
    console.log('Migration successful: Workout metric columns added');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
