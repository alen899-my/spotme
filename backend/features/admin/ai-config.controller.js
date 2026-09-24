'use strict';

/**
 * ai-config.controller.js — Express route handlers for the admin AI config API.
 *
 * All routes are protected by adminAuth middleware (applied in the router).
 * Each handler validates input, delegates to the service, and returns JSON.
 *
 * Route prefix (mounted in admin router): /api/admin/ai
 */

const router = require('express').Router();
const svc = require('./ai-config.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wrap async handlers so uncaught errors are forwarded to Express error middleware. */
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/** Standard success envelope. */
const ok = (res, data) => res.json({ success: true, data });

// ─── Providers ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/ai/providers
 * Lists all providers. API keys are masked — only first 8 + last 4 chars shown.
 */
router.get('/providers', wrap(async (req, res) => {
  const data = await svc.listProviders();
  ok(res, data);
}));

/**
 * POST /api/admin/ai/providers
 * Creates or updates a provider by name (upsert).
 * Body: { name, display_name, base_url, api_key?, priority?, is_enabled? }
 */
router.post('/providers', wrap(async (req, res) => {
  const { name, display_name, base_url } = req.body;
  if (!name || !display_name || !base_url) {
    return res.status(400).json({ success: false, message: 'name, display_name, base_url are required' });
  }
  const data = await svc.upsertProvider(req.body);
  ok(res, data);
}));

/**
 * PATCH /api/admin/ai/providers/:id/toggle
 * Enables or disables a provider. Body: { is_enabled: boolean }
 * Disabling a provider means its models are skipped in the callAI() fallback chain.
 */
router.patch('/providers/:id/toggle', wrap(async (req, res) => {
  const { is_enabled } = req.body;
  if (is_enabled == null) return res.status(400).json({ success: false, message: 'is_enabled is required' });
  const data = await svc.toggleProvider(req.params.id, is_enabled);
  if (!data) return res.status(404).json({ success: false, message: 'Provider not found' });
  ok(res, data);
}));

/**
 * PATCH /api/admin/ai/providers/:id
 * Full edit by id. Blank api_key = keep existing; pass clear_api_key:true to wipe it.
 * Body: { name?, display_name?, base_url?, api_key?, clear_api_key?, priority?, is_enabled? }
 */
router.patch('/providers/:id', wrap(async (req, res) => {
  try {
    const data = await svc.updateProvider(req.params.id, req.body || {});
    if (!data) return res.status(404).json({ success: false, message: 'Provider not found' });
    ok(res, data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Update failed' });
  }
}));

/**
 * DELETE /api/admin/ai/providers/:id
 * Deletes only when no models reference it. Otherwise 409 with modelCount.
 */
router.delete('/providers/:id', wrap(async (req, res) => {
  const result = await svc.deleteProvider(req.params.id);
  if (!result) return res.status(404).json({ success: false, message: 'Provider not found' });
  if (result.blocked) {
    return res.status(409).json({
      success: false,
      message: `Cannot delete: ${result.modelCount} model(s) still reference this provider. Disable or reassign them first.`,
      modelCount: result.modelCount,
    });
  }
  ok(res, result);
}));

// ─── Models ───────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/ai/models?provider_id=<id>
 * Lists all models. Optional query param filters by provider.
 */
router.get('/models', wrap(async (req, res) => {
  const data = await svc.listModels(req.query.provider_id || null);
  ok(res, data);
}));

/**
 * POST /api/admin/ai/models
 * Adds a new model (or updates existing one by provider+model_id).
 * Body: { provider_id, model_id, display_name, supports_vision?, context_window?,
 *         max_output_tokens?, input_cost_per_m?, output_cost_per_m?, rpm_limit?, rpd_limit? }
 */
router.post('/models', wrap(async (req, res) => {
  const { provider_id, model_id } = req.body;
  if (!provider_id || !model_id) {
    return res.status(400).json({ success: false, message: 'provider_id and model_id are required' });
  }
  const data = await svc.createModel(req.body);
  ok(res, data);
}));

/**
 * PATCH /api/admin/ai/models/:id/toggle
 * Enables or disables a specific model. Body: { is_enabled: boolean }
 */
router.patch('/models/:id/toggle', wrap(async (req, res) => {
  const { is_enabled } = req.body;
  if (is_enabled == null) return res.status(400).json({ success: false, message: 'is_enabled is required' });
  const data = await svc.toggleModel(req.params.id, is_enabled);
  ok(res, data);
}));

// ─── Task Configs ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/ai/tasks
 * Lists all 8 task configs with their current model assignment.
 * This is the main data source for the Tasks tab in the admin panel.
 */
router.get('/tasks', wrap(async (req, res) => {
  const data = await svc.listTasks();
  ok(res, data);
}));

/**
 * PATCH /api/admin/ai/tasks/:taskKey
 * Updates a task config. Any combination of fields can be patched.
 * Body: { primary_model_id?, temperature?, max_tokens?, is_enabled? }
 *
 * This is the core "admin control" action — changing primary_model_id
 * here immediately reroutes all future calls for that AI feature.
 */
router.patch('/tasks/:taskKey', wrap(async (req, res) => {
  const data = await svc.updateTask(req.params.taskKey, req.body);
  if (!data) return res.status(404).json({ success: false, message: 'Task not found' });
  ok(res, data);
}));

// ─── Usage Logs & Stats ───────────────────────────────────────────────────────

/**
 * GET /api/admin/ai/usage
 * Paginated usage log with optional filters.
 * Query params: task_key, provider_name, success, start_date, end_date, limit, offset
 */
router.get('/usage', wrap(async (req, res) => {
  const { task_key, provider_name, success, start_date, end_date, limit, offset } = req.query;
  const data = await svc.getUsageLogs({
    taskKey:      task_key,
    providerName: provider_name,
    success:      success != null ? success === 'true' : null,
    startDate:    start_date,
    endDate:      end_date,
    limit:        parseInt(limit) || 50,
    offset:       parseInt(offset) || 0,
  });
  ok(res, data);
}));

/**
 * GET /api/admin/ai/usage/stats?period=7d
 * Aggregated stats per task key. period: 'today' | '7d' | '30d' | 'all'
 * Used for the analytics charts in the admin panel.
 */
router.get('/usage/stats', wrap(async (req, res) => {
  const data = await svc.getUsageStats(req.query.period || '30d');
  ok(res, data);
}));

/**
 * POST /api/admin/ai/cache/invalidate
 * Deprecated no-op kept for old admin builds. There is no cache anymore —
 * every AI call reads fresh from the DB.
 */
router.post('/cache/invalidate', (req, res) => {
  ok(res, { message: 'No cache configured. Config is always fresh from DB.' });
});

module.exports = router;
