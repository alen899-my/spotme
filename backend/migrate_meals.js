require('dotenv').config({ path: __dirname + '/.env' });
const { pool } = require('./db');

async function migrate() {
  try {
    console.log('Creating meals tables...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url TEXT,
        total_calories FLOAT DEFAULT 0,
        total_protein FLOAT DEFAULT 0,
        total_carbs FLOAT DEFAULT 0,
        total_fat FLOAT DEFAULT 0,
        meal_type VARCHAR(50), -- morning, afternoon, evening, night
        logged_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
      );

      CREATE TABLE IF NOT EXISTS meal_items (
        id SERIAL PRIMARY KEY,
        meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        quantity VARCHAR(100),
        calories FLOAT DEFAULT 0,
        protein FLOAT DEFAULT 0,
        carbs FLOAT DEFAULT 0,
        fat FLOAT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
      );
    `);

    console.log('Meals tables created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
