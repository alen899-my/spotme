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

    // Create workout splits tables (Hierarchical: Split -> Sessions -> Exercises)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_splits (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id SERIAL PRIMARY KEY,
        split_id INT REFERENCES workout_splits(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workout_session_exercises (
        id SERIAL PRIMARY KEY,
        session_id INT REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id VARCHAR(10) REFERENCES exercises(id),
        sets INT DEFAULT 3,
        reps VARCHAR(50) DEFAULT '8-12',
        rest_time VARCHAR(50) DEFAULT '60s',
        weight VARCHAR(50) DEFAULT '0',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // ── Daily Workout Logging Tables ─────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_workouts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        split_id INT REFERENCES workout_splits(id) ON DELETE SET NULL,
        session_id INT REFERENCES workout_sessions(id) ON DELETE SET NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        total_duration_seconds INT DEFAULT 0,
        total_volume NUMERIC(10,2) DEFAULT 0,
        notes TEXT,
        completion_photo_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'active',
        total_rest_seconds INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS daily_workout_exercises (
        id SERIAL PRIMARY KEY,
        daily_workout_id INT REFERENCES daily_workouts(id) ON DELETE CASCADE,
        exercise_id VARCHAR(10) REFERENCES exercises(id),
        target_sets INT DEFAULT 3,
        target_reps VARCHAR(50) DEFAULT '8-12',
        target_weight VARCHAR(50) DEFAULT '0',
        target_rest_time VARCHAR(50) DEFAULT '60s',
        sort_order INT DEFAULT 0,
        is_completed BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS daily_workout_sets (
        id SERIAL PRIMARY KEY,
        daily_exercise_id INT REFERENCES daily_workout_exercises(id) ON DELETE CASCADE,
        set_number INT NOT NULL,
        weight NUMERIC(6,2) DEFAULT 0,
        reps INT DEFAULT 0,
        duration_seconds INT DEFAULT 0,
        rest_seconds INT DEFAULT 0,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Water Intake Logging ─────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS water_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount_ml INT NOT NULL,
        logged_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS meal_recommendations (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        bmi NUMERIC(4,1),
        bmi_category VARCHAR(50),
        calories_target INT,
        protein_target INT,
        carbs_target INT,
        fat_target INT,
        user_weight VARCHAR(50),
        user_height VARCHAR(50),
        user_goal VARCHAR(100),
        csv_schedule TEXT,
        csv_meal_plan TEXT,
        recommended_meals JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS gym_csv_recommendations (
        id SERIAL PRIMARY KEY,
        gender VARCHAR(50) NOT NULL,
        goal VARCHAR(100) NOT NULL,
        bmi_category VARCHAR(50) NOT NULL,
        schedule TEXT,
        meal_plan TEXT,
        UNIQUE(gender, goal, bmi_category)
      );
    `);

    console.log("Database connected and all tables ready");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};

module.exports = { pool, initDB };
