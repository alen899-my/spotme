require('dotenv').config();
const { pool } = require('./db');

async function migrate() {
  try {
    console.log('Adding skip columns...');
    await pool.query('ALTER TABLE daily_workout_exercises ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT false');
    await pool.query('ALTER TABLE daily_workout_sets ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT false');
    console.log('Migration successful: is_skipped columns added');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
