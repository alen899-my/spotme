'use strict';

/**
 * ai-config.service.js — DB operations for the AI Configuration System.
 *
 * All functions here are called by the admin API controller. They do the
 * actual Postgres queries and return plain JS objects.
 *
 * No caching layer — every AI call reads fresh from the DB.
 */

const { pool } = require('../../db');

// ─── Providers ────────────────────────────────────────────────────────────────

/**
 * listProviders()
 * Returns all providers ordered by priority. API key is masked for display:
 * only first 8 and last 4 characters are shown (e.g. sk-or-v1-****...x781).
 */
async function listProviders() {
  const { rows } = await pool.query(
    `SELECT id, name, display_name, base_url, priority, is_enabled, created_at, updated_at,
            CASE WHEN api_key IS NOT NULL
              THEN LEFT(api_key, 8) || '****...' || RIGHT(api_key, 4)
              ELSE NULL
            END AS api_key_masked
     FROM ai_providers ORDER BY priority ASC`
  );
  return rows;
}

/**
 * upsertProvider(data)
 * Creates a new provider or updates an existing one by name.
 * api_key is only updated when explicitly provided (truthy) so admins can
 * update display_name or priority without accidentally clearing the key.
 */
async function upsertProvider({ name, display_name, base_url, api_key, priority, is_enabled }) {
  const { rows } = await pool.query(
    `INSERT INTO ai_providers (name, display_name, base_url, api_key, priority, is_enabled)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (name) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       base_url     = EXCLUDED.base_url,
       api_key      = COALESCE(EXCLUDED.api_key, ai_providers.api_key),
       priority     = EXCLUDED.priority,
       is_enabled   = EXCLUDED.is_enabled,
       updated_at   = NOW()
     RETURNING id, name, display_name, base_url, priority, is_enabled`,
    [name, display_name, base_url, api_key || null, priority ?? 10, is_enabled ?? true]
  );
  return rows[0];
}

/**
 * toggleProvider(id, is_enabled)
 * Enables or disables a provider. Disabling cascades to all its models
 * in the query layer (JOIN condition includes ap.is_enabled = TRUE).
 */
async function toggleProvider(id, is_enabled) {
  const { rows } = await pool.query(
    `UPDATE ai_providers SET is_enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, is_enabled`,
    [is_enabled, id]
  );
  return rows[0];
}

/**
 * updateProvider(id, data)
 * Full edit by id. `undefined` = leave unchanged.
 * - name: lowercased/trimmed, must match ^[a-z0-9-]+$, must stay unique.
 * - api_key: non-empty trimmed string = update; blank/undefined = keep;
 *   pass clear_api_key:true to explicitly set NULL.
 */
async function updateProvider(id, { name, display_name, base_url, api_key, clear_api_key, priority, is_enabled }) {
  const sets = [];
  const params = [];

  if (name !== undefined) {
    const normalized = String(name).toLowerCase().trim();
    if (!/^[a-z0-9-]+$/.test(normalized)) {
      const err = new Error('Invalid provider name. Use lowercase letters, numbers, hyphens only.');
      err.status = 400;
      throw err;
    }
    const dup = await pool.query(
      `SELECT id FROM ai_providers WHERE name = $1 AND id <> $2 LIMIT 1`,
      [normalized, id]
    );
    if (dup.rows.length) {
      const err = new Error(`Provider name '${normalized}' is already in use.`);
      err.status = 409;
      throw err;
    }
    params.push(normalized);
    sets.push(`name = $${params.length}`);
  }
  if (display_name !== undefined) {
    if (typeof display_name !== 'string' || !display_name.trim()) {
      const err = new Error('display_name must be a non-empty string.');
      err.status = 400;
      throw err;
    }
    params.push(display_name.trim());
    sets.push(`display_name = $${params.length}`);
  }
  if (base_url !== undefined) {
    if (typeof base_url !== 'string' || !/^https?:\/\/.+/i.test(base_url.trim())) {
      const err = new Error('base_url must be a valid http(s) URL.');
      err.status = 400;
      throw err;
    }
    params.push(base_url.trim());
    sets.push(`base_url = $${params.length}`);
  }
  if (clear_api_key === true) {
    sets.push(`api_key = NULL`);
  } else if (api_key !== undefined && api_key !== null && String(api_key).trim() !== '') {
    params.push(String(api_key).trim());
    sets.push(`api_key = $${params.length}`);
  }
  if (priority !== undefined) {
    const p = Number(priority);
    if (!Number.isInteger(p) || p < 1 || p > 99) {
      const err = new Error('priority must be an integer between 1 and 99.');
      err.status = 400;
      throw err;
    }
    params.push(p);
    sets.push(`priority = $${params.length}`);
  }
  if (is_enabled !== undefined) {
    params.push(Boolean(is_enabled));
    sets.push(`is_enabled = $${params.length}`);
  }
  if (!sets.length) {
    const { rows } = await pool.query(`SELECT * FROM ai_providers WHERE id = $1`, [id]);
    return rows[0] || null;
  }
  sets.push(`updated_at = NOW()`);
  params.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE ai_providers SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING id, name, display_name, base_url, priority, is_enabled, updated_at`,
      params
    );
    return rows[0] || null;
  } catch (err) {
    if (err.code === '23505') {
      const dup = new Error('Provider name is already in use.');
      dup.status = 409;
      throw dup;
    }
    throw err;
  }
}

/**
 * deleteProvider(id)
 * Deletes a provider only when no models reference it.
 * Returns { deleted:true } or { blocked:true, modelCount }.
 */
async function deleteProvider(id) {
  const { rows: refs } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM ai_models WHERE provider_id = $1`,
    [id]
  );
  const modelCount = refs[0]?.cnt ?? 0;
  if (modelCount > 0) return { blocked: true, modelCount };
  const { rows } = await pool.query(`DELETE FROM ai_providers WHERE id = $1 RETURNING id`, [id]);
  if (!rows.length) return null;
  return { deleted: true };
}

// ─── Models ───────────────────────────────────────────────────────────────────

/**
 * listModels(providerId?)
 * Returns all models, optionally filtered by provider.
 * Includes the provider name for display purposes.
 */
async function listModels(providerId = null) {
  const params = [];
  let where = '';
  if (providerId) {
    params.push(providerId);
    where = 'WHERE am.provider_id = $1';
  }
  const { rows } = await pool.query(
    `SELECT am.*, ap.name AS provider_name, ap.display_name AS provider_display_name
     FROM ai_models am
     JOIN ai_providers ap ON ap.id = am.provider_id
     ${where}
     ORDER BY ap.priority ASC, am.display_name ASC`,
    params
  );
  return rows;
}

/**
 * createModel(data)
 * Adds a new model to a provider. model_id must be the exact string the
 * provider's API expects (e.g. 'gemini-3.1-flash-lite').
 */
async function createModel({ provider_id, model_id, display_name, supports_vision, context_window,
  max_output_tokens, input_cost_per_m, output_cost_per_m, rpm_limit, rpd_limit }) {
  const { rows } = await pool.query(
    `INSERT INTO ai_models
       (provider_id, model_id, display_name, supports_vision, context_window,
        max_output_tokens, input_cost_per_m, output_cost_per_m, rpm_limit, rpd_limit)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (provider_id, model_id) DO UPDATE SET
       display_name      = EXCLUDED.display_name,
       supports_vision   = EXCLUDED.supports_vision,
       context_window    = EXCLUDED.context_window,
       max_output_tokens = EXCLUDED.max_output_tokens,
       input_cost_per_m  = EXCLUDED.input_cost_per_m,
       output_cost_per_m = EXCLUDED.output_cost_per_m,
       rpm_limit         = EXCLUDED.rpm_limit,
       rpd_limit         = EXCLUDED.rpd_limit,
       updated_at        = NOW()
     RETURNING *`,
    [provider_id, model_id, display_name, supports_vision ?? false, context_window,
     max_output_tokens ?? 4096, input_cost_per_m ?? 0, output_cost_per_m ?? 0, rpm_limit, rpd_limit]
  );
  return rows[0];
}

/**
 * toggleModel(id, is_enabled)
 * Enables or disables a specific model. If a task_config is pointing to this
 * model and it gets disabled, callAI() will fall back to the next tier provider.
 */
async function toggleModel(id, is_enabled) {
  const { rows } = await pool.query(
    `UPDATE ai_models SET is_enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING id, model_id, is_enabled`,
    [is_enabled, id]
  );
  return rows[0];
}

// ─── Task Configs ─────────────────────────────────────────────────────────────

/**
 * listTasks()
 * Returns all task configs with their assigned model and provider details.
 * This is what the admin panel renders in the Tasks tab.
 */
async function listTasks() {
  const { rows } = await pool.query(
    `SELECT tc.*, am.model_id, am.display_name AS model_display_name,
            am.supports_vision, ap.name AS provider_name, ap.display_name AS provider_display_name
     FROM ai_task_configs tc
     LEFT JOIN ai_models   am ON am.id = tc.primary_model_id
     LEFT JOIN ai_providers ap ON ap.id = am.provider_id
     ORDER BY tc.task_key ASC`
  );
  return rows;
}

/**
 * updateTask(taskKey, data)
 * Updates the model assignment, temperature, max_tokens, or enabled state
 * for one AI feature. This is the core "admin control" action — changing
 * primary_model_id here reroutes all future calls for that feature.
 */
async function updateTask(taskKey, { primary_model_id, temperature, max_tokens, is_enabled }) {
  // Build a dynamic SET clause so `undefined` = "leave unchanged" while
  // explicit `null` clears the column (e.g. unassign primary_model_id).
  // Old COALESCE version could never clear a model assignment.
  const sets = [];
  const params = [];
  if (primary_model_id !== undefined) {
    params.push(primary_model_id);
    sets.push(`primary_model_id = $${params.length}`);
  }
  if (temperature !== undefined) {
    params.push(temperature);
    sets.push(`temperature = $${params.length}`);
  }
  if (max_tokens !== undefined) {
    params.push(max_tokens);
    sets.push(`max_tokens = $${params.length}`);
  }
  if (is_enabled !== undefined) {
    params.push(is_enabled);
    sets.push(`is_enabled = $${params.length}`);
  }
  if (!sets.length) {
    const { rows } = await pool.query(`SELECT * FROM ai_task_configs WHERE task_key = $1`, [taskKey]);
    return rows[0] || null;
  }
  sets.push(`updated_at = NOW()`);
  params.push(taskKey);
  const { rows } = await pool.query(
    `UPDATE ai_task_configs SET ${sets.join(', ')} WHERE task_key = $${params.length} RETURNING *`,
    params
  );
  return rows[0];
}

// ─── Usage Logs ───────────────────────────────────────────────────────────────

/**
 * getUsageLogs({ taskKey, providerName, success, startDate, endDate, limit, offset })
 * Paginated usage log query with optional filters.
 * Used by the Usage Logs tab in the admin panel.
 */
async function getUsageLogs({ taskKey, providerName, success, startDate, endDate, limit = 50, offset = 0 }) {
  const conditions = [];
  const params = [];

  if (taskKey)      { params.push(taskKey);      conditions.push(`task_key = $${params.length}`); }
  if (providerName) { params.push(providerName); conditions.push(`provider_name = $${params.length}`); }
  if (success != null) { params.push(success);   conditions.push(`success = $${params.length}`); }
  if (startDate)    { params.push(startDate);    conditions.push(`created_at >= $${params.length}`); }
  if (endDate)      { params.push(endDate);      conditions.push(`created_at <= $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT id, task_key, user_id, provider_name, model_used,
            prompt_tokens, completion_tokens, total_tokens,
            latency_ms, cost_usd, success, error_message, created_at
     FROM ai_usage_logs ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Total count for pagination
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM ai_usage_logs ${where}`,
    params.slice(0, -2) // exclude limit/offset from count query
  );

  return { logs: rows, total: countRes.rows[0].total };
}

/**
 * getUsageStats({ period })
 * Returns aggregated stats grouped by task_key for the analytics dashboard.
 * period: 'today' | '7d' | '30d' | 'all'
 */
async function getUsageStats(period = '30d') {
  const intervals = { today: '1 day', '7d': '7 days', '30d': '30 days' };
  const interval = intervals[period];
  const where = interval ? `WHERE created_at >= NOW() - INTERVAL '${interval}'` : '';

  const { rows } = await pool.query(
    `SELECT
       task_key,
       COUNT(*)::int                          AS total_calls,
       SUM(CASE WHEN success THEN 1 ELSE 0 END)::int AS success_calls,
       SUM(total_tokens)::bigint              AS total_tokens,
       ROUND(SUM(cost_usd)::numeric, 6)       AS total_cost_usd,
       ROUND(AVG(latency_ms))::int            AS avg_latency_ms,
       provider_name
     FROM ai_usage_logs ${where}
     GROUP BY task_key, provider_name
     ORDER BY total_calls DESC`
  );
  return rows;
}

module.exports = {
  listProviders, upsertProvider, toggleProvider, updateProvider, deleteProvider,
  listModels, createModel, toggleModel,
  listTasks, updateTask,
  getUsageLogs, getUsageStats,
};
