require('dotenv').config();
const { pool } = require('../db');

async function checkUsers() {
  try {
    const res = await pool.query('SELECT id, email, gender, fitness_goal, weight, height, age, activity_level FROM users');
    console.log("=== Users ===");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkUsers();
