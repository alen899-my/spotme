const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize database table
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50),
        dob DATE,
        gender VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add onboarding fields
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS age INT,
      ADD COLUMN IF NOT EXISTS height VARCHAR(50),
      ADD COLUMN IF NOT EXISTS weight VARCHAR(50),
      ADD COLUMN IF NOT EXISTS body_fat VARCHAR(50),
      ADD COLUMN IF NOT EXISTS fitness_goal VARCHAR(100),
      ADD COLUMN IF NOT EXISTS experience_level VARCHAR(100),
      ADD COLUMN IF NOT EXISTS activity_level VARCHAR(100),
      ADD COLUMN IF NOT EXISTS neck VARCHAR(50),
      ADD COLUMN IF NOT EXISTS waist VARCHAR(50),
      ADD COLUMN IF NOT EXISTS hip VARCHAR(50),
      ADD COLUMN IF NOT EXISTS chest VARCHAR(50),
      ADD COLUMN IF NOT EXISTS arm VARCHAR(50),
      ADD COLUMN IF NOT EXISTS thigh VARCHAR(50),
      ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
      ADD COLUMN IF NOT EXISTS medication VARCHAR(10),
      ADD COLUMN IF NOT EXISTS allergies TEXT,
      ADD COLUMN IF NOT EXISTS diet_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS food_preference VARCHAR(100),
      ADD COLUMN IF NOT EXISTS water_intake VARCHAR(100),
      ADD COLUMN IF NOT EXISTS food_allergies TEXT,
      ADD COLUMN IF NOT EXISTS profile_pic_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS front_photo_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS back_photo_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS side_photo_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
    `);

    // Create exercises table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        body_part VARCHAR(100),
        equipment VARCHAR(100),
        instructions_en TEXT,
        instructions_tr TEXT,
        instruction_steps_en TEXT[],
        instruction_steps_tr TEXT[],
        muscle_group VARCHAR(100),
        secondary_muscles TEXT[],
        target VARCHAR(100),
        image_url VARCHAR(500),
        gif_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database connected and all tables ready");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};

module.exports = { pool, initDB };
