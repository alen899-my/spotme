-- =============================================================================
-- Migration 002: AI Configuration System
-- Creates 4 tables for admin-controlled AI provider/model management.
-- Run via: node scripts/run-migration.js
-- Safe to re-run (all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- =============================================================================

-- TABLE 1: ai_providers
-- One row per AI provider. Admin can add new ones (Anthropic, OpenAI, etc.)
-- without any code changes.
CREATE TABLE IF NOT EXISTS ai_providers (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(50)  UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  base_url     TEXT         NOT NULL,
  api_key      TEXT,
  is_enabled   BOOLEAN      DEFAULT TRUE,
  priority     INT          DEFAULT 10,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- TABLE 2: ai_models
-- One row per model per provider. Tracks vision support, rate limits, cost.
CREATE TABLE IF NOT EXISTS ai_models (
  id                  SERIAL PRIMARY KEY,
  provider_id         INT          NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model_id            VARCHAR(200) NOT NULL,
  display_name        VARCHAR(200),
  supports_vision     BOOLEAN      DEFAULT FALSE,
  context_window      INT,
  max_output_tokens   INT          DEFAULT 4096,
  input_cost_per_m    NUMERIC(12,6) DEFAULT 0,
  output_cost_per_m   NUMERIC(12,6) DEFAULT 0,
  rpm_limit           INT,
  rpd_limit           INT,
  is_enabled          BOOLEAN      DEFAULT TRUE,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(provider_id, model_id)
);

-- TABLE 3: ai_task_configs
-- One row per AI feature. Admin sets the model, temp, tokens, enabled.
-- Changing primary_model_id reroutes all future calls for that feature.
CREATE TABLE IF NOT EXISTS ai_task_configs (
  id               SERIAL PRIMARY KEY,
  task_key         VARCHAR(100) UNIQUE NOT NULL,
  display_name     VARCHAR(200) NOT NULL,
  description      TEXT,
  primary_model_id INT          REFERENCES ai_models(id) ON DELETE SET NULL,
  temperature      NUMERIC(3,2) DEFAULT 0.20,
  max_tokens       INT          DEFAULT 4096,
  is_enabled       BOOLEAN      DEFAULT TRUE,
  requires_vision  BOOLEAN      DEFAULT FALSE,
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- TABLE 4: ai_usage_logs
-- One row per AI API call. Records tokens, latency, cost, success/fail.
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id                BIGSERIAL PRIMARY KEY,
  task_key          VARCHAR(100) NOT NULL,
  user_id           INT          REFERENCES users(id) ON DELETE SET NULL,
  provider_name     VARCHAR(50)  NOT NULL,
  model_used        VARCHAR(200) NOT NULL,
  prompt_tokens     INT,
  completion_tokens INT,
  total_tokens      INT,
  latency_ms        INT,
  cost_usd          NUMERIC(12,8),
  success           BOOLEAN      DEFAULT TRUE,
  error_message     TEXT,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_task    ON ai_usage_logs(task_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user    ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at DESC);

-- =============================================================================
-- SEED: Task Configs (the 8 AI features)
-- primary_model_id is NULL here — the migration script sets it after inserting models.
-- =============================================================================
INSERT INTO ai_task_configs (task_key, display_name, description, temperature, max_tokens, requires_vision) VALUES
  ('coach_chat',             'AI Coach Chat',           'Conversational coaching with full user fitness context',   0.20, 4096, false),
  ('meal_analysis',          'Meal Photo Analysis',     'Vision: food photo -> nutrition JSON',                     0.10, 2048, true),
  ('physique_analysis',      'Physique Analysis',       'Vision: body photo -> muscle score JSON',                  0.10, 2048, true),
  ('workout_split_generate', 'Workout Split Generator', 'Generate a structured N-day training split as JSON',       0.25, 6000, false),
  ('workout_split_refine',   'Workout Split Refiner',   'Refine or update an existing training split as JSON',      0.25, 6000, false),
  ('workout_report',         'Workout Report',          'Multi-section post-workout AI analysis report',            0.30, 8192, false),
  ('workout_coach_chat',     'In-Workout Coach Chat',   'Answer mid-workout questions based on the active session', 0.20, 2048, false),
  ('diet_plan_generate',     'Diet Plan Generator',     'Generate personalized daily meal plan from user profile',  0.20, 6000, false)
ON CONFLICT (task_key) DO NOTHING;
