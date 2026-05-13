const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const splits = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workout_splits'"
  );
  console.log('workout_splits columns:', splits.rows.map(r => r.column_name).join(', '));

  const sessions = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workout_sessions'"
  );
  console.log('workout_sessions columns:', sessions.rows.map(r => r.column_name).join(', '));

  const exs = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workout_session_exercises'"
  );
  console.log('workout_session_exercises columns:', exs.rows.map(r => r.column_name).join(', '));

  // Sample exercises by category
  const cats = await pool.query(
    "SELECT category, COUNT(*) as cnt FROM exercises GROUP BY category ORDER BY category"
  );
  console.log('\nExercise counts by category:');
  cats.rows.forEach(r => console.log(`  ${r.category}: ${r.cnt}`));

  pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
