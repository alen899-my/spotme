require('dotenv').config();
const { pool } = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add XP and league columns to users
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS league_tier VARCHAR(20) NOT NULL DEFAULT 'Bronze',
        ADD COLUMN IF NOT EXISTS last_workout_date DATE,
        ADD COLUMN IF NOT EXISTS consecutive_miss_days INTEGER NOT NULL DEFAULT 0;
    `);

    // Create XP transaction ledger (audit trail)
    await client.query(`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        reason VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Leaderboard migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
