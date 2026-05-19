require('dotenv').config();
const { pool } = require('./db');

async function migrate() {
  try {
    console.log('Adding rating columns to daily_workouts and daily_workout_exercises...');
    
    // Add rating to daily_workouts
    await pool.query(`
      ALTER TABLE daily_workouts 
      ADD COLUMN IF NOT EXISTS rating INT CHECK (rating >= 1 AND rating <= 10) DEFAULT NULL
    `);
    
    // Add rating to daily_workout_exercises
    await pool.query(`
      ALTER TABLE daily_workout_exercises 
      ADD COLUMN IF NOT EXISTS rating INT CHECK (rating >= 1 AND rating <= 10) DEFAULT NULL
    `);

    console.log('Migration successful: Rating columns added to daily_workouts and daily_workout_exercises.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
