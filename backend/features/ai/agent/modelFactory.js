'use strict';

/**
 * agent/modelFactory.js — DB-routed LangChain chat models (all 8 tasks).
 *
 * Reads ai_task_configs -> ai_models -> ai_providers (same source as legacy
 * utils/ai.js callAI) and instantiates the matching LangChain BaseChatModel:
 *   openrouter -> ChatOpenAI  (baseURL = provider.base_url, apiKey)
 *   gemini     -> ChatGoogleGenerativeAI
 *   groq       -> ChatGroq
 * Unknown provider -> OpenAI-compatible ChatOpenAI against base_url.
 *
 * Returns null when langchain packages aren't installed or config missing —
 * runner then falls back to legacy callAI (same model routing, zero downtime).
 * Every invoke is logged via aiLogger (tokens estimated when API omits usage).
 */

const { getTaskConfig } = require('../../../utils/aiConfig');
const { logUsage } = require('../../../utils/aiLogger');

function pickCtor(providerName) {  const p = String(providerName || 'openrouter').toLowerCase().trim();
  try {
    if (p === 'gemini') {
      // eslint-disable-next-line global-require, import/no-unresolved
      const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
      return { kind: 'gemini', Ctor: ChatGoogleGenerativeAI };
    }
    if (p === 'groq') {
      // eslint-disable-next-line global-require, import/no-unresolved
      const { ChatGroq } = require('@langchain/groq');
      return { kind: 'groq', Ctor: ChatGroq };
    }
    // eslint-disable-next-line global-require, import/no-unresolved
    const { ChatOpenAI } = require('@langchain/openai');
    return { kind: 'openai-compat', Ctor: ChatOpenAI };
  } catch (e) {
    return { kind: 'missing', Ctor: null, error: e.message };
  }
}

/**
 * getProviderRow(name) — credentials for cascade overrides (ai_providers table).
 */
async function getProviderRow(name) {
  try {
    // eslint-disable-next-line global-require
    const { pool } = require('../../../db');
    const { rows } = await pool.query(
      'SELECT name, base_url, api_key FROM ai_providers WHERE LOWER(name) = LOWER($1) AND is_enabled = TRUE LIMIT 1',
      [name]
    );
    return rows[0] || null;
  } catch (_) {
    return null;
  }
}

/** Proven-live default model per provider (verified 2026-10-04). */
function defaultModelFor(provider) {
  const p = String(provider || '').toLowerCase();
  if (p === 'gemini') return process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  if (p === 'groq') return 'openai/gpt-oss-20b';
  return process.env.OPENROUTER_MODEL || 'openrouter/free';
}

/**
 * getCascadeModels(taskKey, skipProvider) — up to 2 fallback providers
 * (gemini -> groq -> openrouter), skipping whoever just failed.
 */
async function getCascadeModels(taskKey, skipProvider) {
  const out = [];
  for (const p of ['gemini', 'groq', 'openrouter']) {
    if (p === String(skipProvider || '').toLowerCase()) continue;
    try {
      const r = await getChatModel(taskKey, p);
      if (r && r.model) out.push(r);
    } catch (_) {}
    if (out.length >= 2) break;
  }
  return out;
}

/**
 * getChatModel(taskKey, providerOverride) — DB-routed LangChain chat model.
 * providerOverride ('gemini'|'groq'|'openrouter'): force a provider (cascade),
 * using its ai_providers row (or env) for credentials + a proven default model.
 */
async function getChatModel(taskKey = 'coach_chat', providerOverride = null) {
  let cfg = null;
  try {
    cfg = await getTaskConfig(taskKey);
  } catch (e) {
    console.warn(`[agent/modelFactory] no task config for '${taskKey}': ${e.message}`);
  }
  let provider = cfg?.provider_name || 'openrouter';
  let modelId = cfg?.model_id || process.env.OPENROUTER_MODEL || 'openrouter/free';
  let apiKey = cfg?.api_key || null;
  let baseUrl = cfg?.base_url || null;

  if (providerOverride) {
    const row = await getProviderRow(providerOverride);
    provider = providerOverride;
    apiKey = (row?.api_key || '').trim() || null;
    baseUrl = row?.base_url || null;
    modelId = defaultModelFor(provider);
  }
  const temperature = cfg?.temperature != null ? Number(cfg.temperature) : 0.2;
  const maxTokens = cfg?.max_tokens != null ? Number(cfg.max_tokens) : 4096;

  const { kind, Ctor, error } = pickCtor(provider);
  if (!Ctor) {
    console.warn(`[agent/modelFactory] chat model unavailable (${error || kind}) — legacy fallback.`);
    return null;
  }

  const common = { temperature, maxTokens };
  // Resolved credentials (task row, cascade row, or env).
  const creds = {
    gemini: apiKey || process.env.GEMINI_API_KEY,
    groq: apiKey || process.env.GROQ_API_KEY,
    openrouter: apiKey || process.env.OPENROUTER_API_KEY,
  };
  // make(id): build a model instance for any model id (enables fallback retry).
  const make = (id) => {
    if (kind === 'gemini') {
      return new Ctor({ apiKey: creds.gemini, model: id, ...common });
    }
    if (kind === 'groq') {
      return new Ctor({ apiKey: creds.groq, model: id, ...common });
    }
    return new Ctor({
      apiKey: creds.openrouter,
      model: id,
      configuration: baseUrl ? { baseURL: baseUrl } : undefined,
      ...common,
    });
  };
  let model;
  try {
    model = make(modelId);
  } catch (e) {
    console.warn(`[agent/modelFactory] ctor failed: ${e.message} — legacy fallback.`);
    return null;
  }
  return {
    model,
    meta: { provider, modelId, temperature, maxTokens, taskKey, cfg },
    make,
  };
}

function fallbackModelId(meta) {
  const p = String(meta.provider || '').toLowerCase();
  if (p === 'gemini') return process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  if (p === 'groq') return 'openai/gpt-oss-20b';
  return process.env.OPENROUTER_MODEL || 'openrouter/free';
}

/**
 * resolveFallbackId(meta) — async, self-healing fallback for OpenRouter.
 * Free-model ids rot (admin saved a removed ':free' id); instead of a static
 * guess, query /models once per hour and pick: env preferred (if live) ->
 * first live ':free' -> first live model. Non-OpenRouter: static default.
 */
let _liveModelCache = { at: 0, ids: [] };

async function fetchLiveModelIds(apiKey, baseUrl) {
  if (Date.now() - _liveModelCache.at < 3600 * 1000 && _liveModelCache.ids.length) {
    return _liveModelCache.ids;
  }
  try {
    // eslint-disable-next-line global-require
    const axios = require('axios');
    const base = String(baseUrl || 'https://openrouter.ai/api/v1/chat/completions').replace(/\/chat\/completions\/?$/, '');
    const { data } = await axios.get(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 20000,
    });
    const ids = ((data && data.data) || []).map((m) => m && m.id).filter(Boolean);
    if (ids.length) _liveModelCache = { at: Date.now(), ids };
    return ids;
  } catch (e) {
    console.warn(`[agent/modelFactory] /models discovery failed: ${e.message}`);
    return _liveModelCache.ids;
  }
}

async function resolveFallbackId(meta) {
  const p = String(meta.provider || '').toLowerCase();
  if (p !== 'openrouter') return fallbackModelId(meta);
  const ids = await fetchLiveModelIds(meta.cfg?.api_key || process.env.OPENROUTER_API_KEY, meta.cfg?.base_url);
  // 'openrouter/*' router aliases are listed by /models but reject chat
  // completions — never select them (nor the DB's dead id verbatim).
  const usable = ids.filter((id) => !/^openrouter\//.test(id));
  const pool = usable.length ? usable : ids;
  if (!pool.length) return fallbackModelId(meta);
  const envPref = process.env.OPENROUTER_MODEL;
  if (envPref && pool.includes(envPref)) return envPref;
  if (pool.includes(meta.modelId)) return meta.modelId; // race: list refreshed, id live again
  const free = pool.find((id) => /:free$/.test(id));
  return free || pool[0];
}

function isUnknownModelError(err) {
  const status = err?.status || err?.response?.status || err?.code;
  if (status === 400 || status === 404) return true;
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('not found') && msg.includes('model');
}

/** invokeModel(model, meta, messages, {userId, make}) -> string content. */
async function invokeModel(model, meta, messages, { userId = null, make = null } = {}) {
  const t0 = Date.now();
  const attempt = async (mdl, mid) => {
    try {
      const res = await mdl.invoke(messages);
      const text = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
      logUsage({
        taskKey: meta.taskKey,
        userId,
        providerName: meta.provider,
        modelUsed: mid,
        promptText: JSON.stringify(messages).slice(0, 8000),
        completionText: text,
        latencyMs: Date.now() - t0,
        inputCostPerM: meta.cfg?.input_cost_per_m || 0,
        outputCostPerM: meta.cfg?.output_cost_per_m || 0,
        success: true,
      });
      return { text, modelUsed: mid };
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Model invoke failed';
      logUsage({
        taskKey: meta.taskKey,
        userId,
        providerName: meta.provider,
        modelUsed: mid,
        latencyMs: Date.now() - t0,
        success: false,
        errorMessage: String(msg).slice(0, 2000),
      });
      err._modelUsed = mid;
      throw err;
    }
  };
  try {
    const { text } = await attempt(model, meta.modelId);
    return text;
  } catch (err) {
    // Unknown/removed model id (admin saved a dead ':free' id): one retry
    // on the env default before giving up to legacy callAI chains.
    if (make && isUnknownModelError(err)) {
      const fb = await resolveFallbackId(meta);
      if (fb && fb !== meta.modelId) {
        console.warn(`[agent/modelFactory] ${meta.modelId} rejected — retrying ${fb}`);
        const { text } = await attempt(make(fb), fb);
        return text;
      }
    }
    throw err;
  }
}

module.exports = { getChatModel, getCascadeModels, invokeModel, fallbackModelId, resolveFallbackId, isUnknownModelError };
