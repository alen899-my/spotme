require('dotenv').config({ path: './backend/.env' });
const { pool } = require('./db');

async function migrate() {
  try {
    console.log('Starting migration: adding started_at to daily_workouts...');
    
    await pool.query(`
      ALTER TABLE daily_workouts 
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
