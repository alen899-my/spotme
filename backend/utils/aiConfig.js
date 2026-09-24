'use strict';

/**
 * aiConfig.js — Database-backed AI configuration (no cache).
 *
 * Every call hits the DB directly so admin changes apply immediately
 * with no flush / TTL / multi-instance staleness.
 *
 * Usage:
 *   const { getTaskConfig } = require('./aiConfig');
 *   const cfg = await getTaskConfig('meal_analysis');
 *   // cfg.model_id, cfg.api_key, cfg.temperature, cfg.max_tokens, ...
 */

const { pool } = require('../db');

const TASK_CONFIG_QUERY = `
  SELECT
    tc.task_key,
    tc.display_name,
    tc.description,
    tc.temperature,
    tc.max_tokens,
    tc.is_enabled,
    tc.requires_vision,
    am.model_id,
    am.supports_vision,
    am.max_output_tokens,
    am.input_cost_per_m,
    am.output_cost_per_m,
    ap.name        AS provider_name,
    ap.display_name AS provider_display_name,
    ap.base_url,
    ap.api_key,
    ap.is_enabled  AS provider_enabled
  FROM ai_task_configs tc
  LEFT JOIN ai_models   am ON am.id = tc.primary_model_id AND am.is_enabled = TRUE
  LEFT JOIN ai_providers ap ON ap.id = am.provider_id  AND ap.is_enabled = TRUE
`;

function normalizeRow(row) {
  return {
    ...row,
    temperature: row.temperature != null ? parseFloat(row.temperature) : 0.2,
    max_tokens: row.max_tokens != null ? parseInt(row.max_tokens, 10) : 4096,
    input_cost_per_m: row.input_cost_per_m != null ? parseFloat(row.input_cost_per_m) : 0,
    output_cost_per_m: row.output_cost_per_m != null ? parseFloat(row.output_cost_per_m) : 0,
  };
}

/**
 * loadConfig()
 * Reads all enabled task configs fresh from the DB on every call.
 * Kept for backward compatibility with existing callers.
 */
async function loadConfig() {
  const result = await pool.query(`${TASK_CONFIG_QUERY} WHERE tc.is_enabled = TRUE ORDER BY tc.task_key`);
  const tasks = {};
  for (const row of result.rows) {
    tasks[row.task_key] = normalizeRow(row);
  }
  return { tasks };
}

/**
 * getTaskConfig(taskKey)
 * Returns the full config object for one AI task, or null if the task is
 * unknown / disabled. Always reads fresh — no cache.
 */
async function getTaskConfig(taskKey) {
  const { rows } = await pool.query(
    `${TASK_CONFIG_QUERY} WHERE tc.task_key = $1 AND tc.is_enabled = TRUE LIMIT 1`,
    [taskKey]
  );
  if (!rows.length) return null;
  return normalizeRow(rows[0]);
}

/**
 * invalidateCache()
 * No-op, kept so old imports don't break. There is no cache anymore —
 * every read is already fresh from the DB.
 */
function invalidateCache() {}

module.exports = { getTaskConfig, invalidateCache, loadConfig };
