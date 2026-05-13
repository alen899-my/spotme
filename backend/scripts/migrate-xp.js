const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Running migration: add XP and Level columns to users...');
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
    `);
    console.log('✅ Migration complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}
migrate();
