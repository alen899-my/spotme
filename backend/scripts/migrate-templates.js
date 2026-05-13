/**
 * Migration: Add template support to workout_splits
 */
const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Running migration: add template columns to workout_splits...');

  await pool.query(`
    ALTER TABLE workout_splits 
    ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS template_goal VARCHAR(100),
    ADD COLUMN IF NOT EXISTS template_level VARCHAR(50),
    ADD COLUMN IF NOT EXISTS template_days INTEGER,
    ADD COLUMN IF NOT EXISTS template_color VARCHAR(20),
    ADD COLUMN IF NOT EXISTS template_icon VARCHAR(50);
  `);

  console.log('✅ Migration complete.');
  await pool.end();
}

migrate().catch(e => { console.error('❌ Migration failed:', e.message); pool.end(); });
