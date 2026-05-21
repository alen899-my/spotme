require('dotenv').config({ path: '../.env' });
const { pool } = require('./db');

async function getTargets() {
  const result = await pool.query(`SELECT DISTINCT target FROM exercises`);
  console.log(result.rows.map(x => x.target));
  process.exit(0);
}
getTargets();
