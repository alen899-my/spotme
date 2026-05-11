require('dotenv').config();
const { pool } = require('./db');

async function migrate() {
  try {
    console.log('Creating daily_workout_photos table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_workout_photos (
        id SERIAL PRIMARY KEY,
        daily_workout_id INT REFERENCES daily_workouts(id) ON DELETE CASCADE,
        photo_url VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Also add a helper to migrate existing single photos if any
    await pool.query(`
      INSERT INTO daily_workout_photos (daily_workout_id, photo_url)
      SELECT id, completion_photo_url 
      FROM daily_workouts 
      WHERE completion_photo_url IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM daily_workout_photos WHERE daily_workout_id = daily_workouts.id
      )
    `);

    console.log('Migration successful: Multi-photo support ready');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
