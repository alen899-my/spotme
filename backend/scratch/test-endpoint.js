require('dotenv').config();
const { pool } = require('../db');
const axios = require('axios');

async function testEndpoint() {
  try {
    // Get a real user token from the database
    console.log("Fetching a sample user from DB...");
    const userResult = await pool.query('SELECT id, email, password FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log("No users found in database to test with.");
      return;
    }
    const sampleUser = userResult.rows[0];
    console.log(`Testing with user: ${sampleUser.email}`);

    // Since we need an auth token, let's login or simulate the auth token
    // We can call /api/auth/login if that route exists, or we can look up the jwt secret and sign a token.
    // Let's check how auth middleware gets the token.
    // We can just generate a token using jsonwebtoken.
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: sampleUser.id, email: sampleUser.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    console.log("Requesting /meals/recommendation with simulated token...");
    // Let's determine the port. Express app port is typically in process.env.PORT or 5000.
    const port = process.env.PORT || 5000;
    const response = await axios.get(`http://localhost:${port}/api/meals/recommendation`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("\n=== Response Status ===");
    console.log(response.status);
    console.log("\n=== Response Data ===");
    console.log(JSON.stringify(response.data, null, 2));

  } catch (err) {
    if (err.response) {
      console.error("Endpoint returned error:", err.response.status, err.response.data);
    } else {
      console.error("Error making request:", err.message);
    }
  } finally {
    await pool.end();
  }
}

testEndpoint();
