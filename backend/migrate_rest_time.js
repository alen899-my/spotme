const { pool } = require('./db');

async function migrate() {
  try {
    console.log('Starting migration: Add total_rest_seconds to daily_workouts');
    await pool.query(`
      ALTER TABLE daily_workouts 
      ADD COLUMN IF NOT EXISTS total_rest_seconds INT DEFAULT 0;
    `);
    console.log('Migration successful: total_rest_seconds added');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
