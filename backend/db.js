const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize database table
const initDB = async () => {
  try {
    // Ensure session timezone is UTC for consistent TIMESTAMPTZ handling
    await pool.query(`SET timezone TO 'UTC'`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50),
        dob DATE,
        gender VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add username column
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE`);

    // Add onboarding fields
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS meals_per_day INT DEFAULT 4;
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS target_weight VARCHAR(50) DEFAULT '0';
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS share_splits BOOLEAN DEFAULT FALSE;
    `);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_steps JSONB DEFAULT '[]'::jsonb;`);

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
        avg_rating NUMERIC(3,1) DEFAULT 0,
        rating_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create workout splits tables (Hierarchical: Split -> Sessions -> Exercises)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_splits (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id SERIAL PRIMARY KEY,
        split_id INT REFERENCES workout_splits(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
        started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMPTZ,
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
        completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE exercises
      ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,1) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

      ALTER TABLE daily_workouts
      ADD COLUMN IF NOT EXISTS water_intake_liters NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS post_workout_weight NUMERIC(6,2),
      ADD COLUMN IF NOT EXISTS rating INT,
      ADD COLUMN IF NOT EXISTS calories_burned INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS calories_burned_method VARCHAR(50),
      ADD COLUMN IF NOT EXISTS workout_met NUMERIC(4,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS streak_at_completion INT DEFAULT 0;

      ALTER TABLE daily_workout_exercises
      ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS best_set_weight NUMERIC(8,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS best_set_reps INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS estimated_1rm NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_set_volume NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS record_metric_type VARCHAR(50) DEFAULT 'estimated_1rm',
      ADD COLUMN IF NOT EXISTS is_personal_record BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_world_record BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS personal_record_value NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS world_record_value NUMERIC(10,2) DEFAULT 0;

      ALTER TABLE daily_workout_sets
      ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS user_exercise_prs (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        exercise_id VARCHAR(10) REFERENCES exercises(id) ON DELETE CASCADE,
        metric_type VARCHAR(50) NOT NULL DEFAULT 'estimated_1rm',
        metric_value NUMERIC(10,2) NOT NULL DEFAULT 0,
        source_weight NUMERIC(8,2) DEFAULT 0,
        source_reps INT DEFAULT 0,
        source_volume NUMERIC(10,2) DEFAULT 0,
        daily_workout_id INT REFERENCES daily_workouts(id) ON DELETE SET NULL,
        daily_exercise_id INT REFERENCES daily_workout_exercises(id) ON DELETE SET NULL,
        achieved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, exercise_id, metric_type)
      );

      CREATE TABLE IF NOT EXISTS global_exercise_prs (
        exercise_id VARCHAR(10) REFERENCES exercises(id) ON DELETE CASCADE,
        metric_type VARCHAR(50) NOT NULL DEFAULT 'estimated_1rm',
        metric_value NUMERIC(10,2) NOT NULL DEFAULT 0,
        source_weight NUMERIC(8,2) DEFAULT 0,
        source_reps INT DEFAULT 0,
        source_volume NUMERIC(10,2) DEFAULT 0,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        daily_workout_id INT REFERENCES daily_workouts(id) ON DELETE SET NULL,
        daily_exercise_id INT REFERENCES daily_workout_exercises(id) ON DELETE SET NULL,
        achieved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (exercise_id, metric_type)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_exercise_prs_user_exercise
      ON user_exercise_prs (user_id, exercise_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_global_exercise_prs_exercise
      ON global_exercise_prs (exercise_id);
    `);

    // ── Social Features (follows & notifications) ─────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INT REFERENCES users(id) ON DELETE CASCADE,
        following_id INT REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        from_user_id INT REFERENCES users(id) ON DELETE CASCADE,
        reference_id INT,
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add reference_id to existing notifications
    try {
      await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id INT`);
    } catch (_) {
      console.warn('Could not add reference_id column (may already exist):', _);
    }

    // ── Push Tokens ─────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        token TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── User Notification Preferences ───────────────────────────────────────
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS water_reminder_enabled BOOLEAN DEFAULT true`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS water_reminder_interval INT DEFAULT 120`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_water_reminded_at TIMESTAMPTZ`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS motivation_enabled BOOLEAN DEFAULT true`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_motivation_sent_at TIMESTAMPTZ`);
    } catch (_) {
      console.warn('Could not add water reminder columns:', _);
    }

    // ── Workout Reports ──────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workout_reports (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        daily_workout_id INT REFERENCES daily_workouts(id) ON DELETE CASCADE,
        summary TEXT NOT NULL,
        good_things TEXT NOT NULL,
        areas_to_improve TEXT NOT NULL,
        recommendations TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add status column to existing workout_reports table
    try {
      await pool.query(`ALTER TABLE workout_reports ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed'`);
    } catch (_) {
      console.warn('Could not add status column (may already exist):', _);
    }

    // Add multi-phase generation columns
    try {
      await pool.query(`ALTER TABLE workout_reports ADD COLUMN IF NOT EXISTS full_content JSONB`);
    } catch (_) {
      console.warn('Could not add full_content column:', _);
    }
    try {
      await pool.query(`ALTER TABLE workout_reports ADD COLUMN IF NOT EXISTS progress_pct INT DEFAULT 0`);
    } catch (_) {
      console.warn('Could not add progress_pct column:', _);
    }
    try {
      await pool.query(`ALTER TABLE workout_reports ADD COLUMN IF NOT EXISTS current_phase VARCHAR(100)`);
    } catch (_) {
      console.warn('Could not add current_phase column:', _);
    }

    // ── Drop template columns (expert splits feature removed) ──────────────
    await pool.query(`
      DELETE FROM workout_splits WHERE user_id IS NULL;
      ALTER TABLE workout_splits DROP COLUMN IF EXISTS is_template;
      ALTER TABLE workout_splits DROP COLUMN IF EXISTS template_goal;
      ALTER TABLE workout_splits DROP COLUMN IF EXISTS template_level;
      ALTER TABLE workout_splits DROP COLUMN IF EXISTS template_days;
      ALTER TABLE workout_splits DROP COLUMN IF EXISTS template_color;
      ALTER TABLE workout_splits DROP COLUMN IF EXISTS template_icon;
    `);

    // ── Split Ratings ───────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS split_ratings (
        id SERIAL PRIMARY KEY,
        split_id INT NOT NULL REFERENCES workout_splits(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 10),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(split_id, user_id)
      );
      ALTER TABLE workout_splits ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,1) DEFAULT 0;
      ALTER TABLE workout_splits ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;
      ALTER TABLE workout_splits ADD COLUMN IF NOT EXISTS cloned_from_id INT REFERENCES workout_splits(id) ON DELETE SET NULL;
    `);

    // ── Water Intake Logging ─────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS water_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount_ml INT NOT NULL,
        logged_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS weight_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        weight NUMERIC(6,2) NOT NULL,
        notes VARCHAR(255),
        logged_at TIMESTAMPTZ DEFAULT NOW()
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

      ALTER TABLE meal_recommendations 
      ADD COLUMN IF NOT EXISTS meals_per_day INT DEFAULT 4,
      ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
      ADD COLUMN IF NOT EXISTS age INT,
      ADD COLUMN IF NOT EXISTS activity_level VARCHAR(100),
      ADD COLUMN IF NOT EXISTS body_fat VARCHAR(50),
      ADD COLUMN IF NOT EXISTS diet_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS food_preference VARCHAR(100);
    `);

    // ── Food Database (merged from food1new, food2, food3 CSVs) ─────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_database (
        id SERIAL PRIMARY KEY,

        -- Source tracking
        source_file        VARCHAR(20)  NOT NULL DEFAULT 'unknown',
        source_group       VARCHAR(100),

        -- Identity
        food_name          TEXT,
        category           TEXT,
        meal_type          TEXT,
        nutrition_grade    TEXT,
        serving_size       TEXT,
        ingredients_text   TEXT,
        image_url          TEXT,
        image_small_url    TEXT,

        -- Core Macros (all per 100g or per serving depending on source)
        calories_kcal      NUMERIC,
        energy_kj          NUMERIC,
        protein_g          NUMERIC,
        carbohydrates_g    NUMERIC,
        fat_g              NUMERIC,
        fiber_g            NUMERIC,
        sugars_g           NUMERIC,

        -- Detailed Fats
        saturated_fat_g    NUMERIC,
        monounsaturated_fat_g  NUMERIC,
        polyunsaturated_fat_g  NUMERIC,
        trans_fat_g        NUMERIC,
        omega3_fat_g       NUMERIC,
        omega6_fat_g       NUMERIC,

        -- Salt, Sodium & Hydration
        salt_g             NUMERIC,
        sodium_mg          NUMERIC,
        cholesterol_mg     NUMERIC,
        water_g            NUMERIC,
        water_intake_ml    NUMERIC,

        -- Vitamins
        vitamin_a          NUMERIC,
        vitamin_b1         NUMERIC,
        vitamin_b2         NUMERIC,
        vitamin_b3_niacin  NUMERIC,
        vitamin_b5         NUMERIC,
        vitamin_b6         NUMERIC,
        vitamin_b11_folate NUMERIC,
        vitamin_b12        NUMERIC,
        vitamin_c          NUMERIC,
        vitamin_d          NUMERIC,
        vitamin_e          NUMERIC,
        vitamin_k          NUMERIC,
        vitamin_pp         NUMERIC,

        -- Minerals
        calcium_mg         NUMERIC,
        phosphorus_mg      NUMERIC,
        potassium_mg       NUMERIC,
        iron_mg            NUMERIC,
        magnesium_mg       NUMERIC,
        zinc_mg            NUMERIC,
        copper_mg          NUMERIC,
        manganese_mg       NUMERIC,
        selenium_ug        NUMERIC,

        -- Quality score
        nutrition_density  NUMERIC,

        created_at         TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add INDB columns to existing table
    try { await pool.query(`ALTER TABLE food_database ADD COLUMN IF NOT EXISTS chromium_mg NUMERIC`); } catch (_) {}
    try { await pool.query(`ALTER TABLE food_database ADD COLUMN IF NOT EXISTS molybdenum_mg NUMERIC`); } catch (_) {}
    try { await pool.query(`ALTER TABLE food_database ADD COLUMN IF NOT EXISTS biotin_ug NUMERIC`); } catch (_) {}
    try { await pool.query(`ALTER TABLE food_database ADD COLUMN IF NOT EXISTS carotenoids_ug NUMERIC`); } catch (_) {}
    try { await pool.query(`ALTER TABLE food_database ADD COLUMN IF NOT EXISTS servings_unit TEXT`); } catch (_) {}
    try { await pool.query(`ALTER TABLE food_database ADD COLUMN IF NOT EXISTS folate_ug NUMERIC`); } catch (_) {}

    // Indexes for fast food search
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_food_db_name ON food_database (food_name);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_food_db_meal_type ON food_database (meal_type);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_food_db_category ON food_database (category);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_food_db_source ON food_database (source_file);`);

    // XP Transactions table (for audit trail)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount INT NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions (user_id);`);

    // ── Leaderboard performance indexes ─────────────────────────────────────
    // Global sort (used by GET /leaderboard and GET /leaderboard/top)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_xp ON users (total_xp DESC);`);
    // Tier-filtered sort (used by GET /leaderboard?tier=Gold etc.)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_tier_xp ON users (league_tier, total_xp DESC);`);
    // Rank lookup for /me ("how many users have more XP than me?")
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_xp_asc ON users (total_xp ASC);`);
    // Name search for /search
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_full_name ON users (full_name text_pattern_ops);`);

    // Water goal tracking column
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS water_goal_date DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS prev_rank INT DEFAULT 0;
    `);

    // ── Physique Analysis AI ─────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS physique_analyses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        photo_url VARCHAR(500),
        overall_score INT DEFAULT 0,
        body_fat_estimate VARCHAR(50),
        muscle_symmetry INT DEFAULT 0,
        posture_score INT DEFAULT 0,
        strengths JSONB DEFAULT '[]'::jsonb,
        improvements JSONB DEFAULT '[]'::jsonb,
        muscle_groups JSONB DEFAULT '{}'::jsonb,
        coach_message TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_physique_analyses_user ON physique_analyses (user_id, created_at DESC);`);

    // ── Rest Day Type Column ─────────────────────────────────────────────────
    await pool.query(`ALTER TABLE daily_workouts ADD COLUMN IF NOT EXISTS rest_type VARCHAR(20);`);

    // ── Missing Indexes for query performance ──────────────────────────────────
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dw_user_status_completed
      ON daily_workouts (user_id, status, completed_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dw_user_post_weight
      ON daily_workouts (user_id, post_workout_weight) WHERE post_workout_weight IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dwe_daily_workout
      ON daily_workout_exercises (daily_workout_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dwe_exercise
      ON daily_workout_exercises (exercise_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dws_daily_exercise
      ON daily_workout_sets (daily_exercise_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_water_logs_user_logged
      ON water_logs (user_id, logged_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_meals_user_logged
      ON meals (user_id, logged_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dw_photos_workout
      ON daily_workout_photos (daily_workout_id, created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workout_reports_lookup
      ON workout_reports (daily_workout_id, user_id, status)`);

    // -- Admin columns for users ---------------------------------------------
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'Free'`);

    // -- Password Reset Tokens ------------------------------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // -- Admin Panel ---------------------------------------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const adminHash = await bcrypt.hash('alenadmin123', 10);
    await pool.query(`
      INSERT INTO admins (email, password, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
    `, ['alenjames899@gmail.com', adminHash, 'Admin']);

  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};

module.exports = { pool, initDB };
