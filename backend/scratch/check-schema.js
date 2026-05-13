const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'exercises'");
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}
check();
