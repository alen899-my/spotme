const { pool } = require('./db');

async function migrate() {
  try {
    console.log('Starting migration: Add target_rest_time to daily_workout_exercises');
    await pool.query(`
      ALTER TABLE daily_workout_exercises 
      ADD COLUMN IF NOT EXISTS target_rest_time VARCHAR(50) DEFAULT '60s';
    `);
    console.log('Migration successful: target_rest_time added');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
