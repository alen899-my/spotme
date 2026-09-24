const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });
const { getTaskConfig } = require('./aiConfig');
const { logUsage } = require('./aiLogger');

// ── API Endpoints ────────────────────────────────────────────────────────────
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── OpenRouter free model fallback chain ─────────────────────────────────────
const OPENROUTER_FALLBACK_MODELS = [
  'openrouter/free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'qwen/qwen-2.5-72b-instruct:free',
];

// ── Gemini verified available model fallback chain ───────────────────────────
// Ordered by highest quality and massive daily quotas (14.4K RPD)
const GEMINI_FALLBACK_MODELS = [
  'gemini-3.1-flash-lite',   // 15 RPM, 500 RPD (Google's best efficient reasoning)
  'gemini-3.5-flash-lite',   // 15 RPM, 500 RPD
  'gemma-4-31b-it',          // 30 RPM, 14,400 RPD (High capacity open weights)
  'gemma-4-26b-a4b-it',      // 30 RPM, 14,400 RPD
  'gemini-3.7-flash',        // 5 RPM, 20 RPD
  'gemini-3.6-flash',        // 5 RPM, 20 RPD
  'gemini-3.5-flash',        // 5 RPM, 20 RPD
  'gemini-3.8-flash',        // 5 RPM, 20 RPD
];

// ── Groq verified available models ───────────────────────────────────────────
const GROQ_FALLBACK_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'groq/compound',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════════════════════
// JSON Extractor (handles markdown fences, brackets, trailing commas, raw JSON)
// ═══════════════════════════════════════════════════════════════════════════
function extractJson(text) {
  if (!text) return null;
  if (typeof text === 'object') return text;

  const raw = String(text).trim();

  // Helper to remove trailing commas before } or ]
  const cleanTrailingCommas = (str) => str.replace(/,\s*([}\]])/g, '$1');

  // 1. Direct parse
  try { return JSON.parse(raw); } catch (_) {}
  try { return JSON.parse(cleanTrailingCommas(raw)); } catch (_) {}

  // 2. Fenced markdown block ```json ... ```
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const trimmed = fencedMatch[1].trim();
    try { return JSON.parse(trimmed); } catch (_) {}
    try { return JSON.parse(cleanTrailingCommas(trimmed)); } catch (_) {}
  }

  // 3. Find bracket array [...]
  const firstBrace = raw.indexOf('{');
  const firstBracket = raw.indexOf('[');

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = raw.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      const chunk = raw.slice(firstBracket, lastBracket + 1);
      try { return JSON.parse(chunk); } catch (_) {}
      try { return JSON.parse(cleanTrailingCommas(chunk)); } catch (_) {}
    }
  }

  // 4. Find object brace {...}
  if (firstBrace !== -1) {
    const lastBrace = raw.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      const chunk = raw.slice(firstBrace, lastBrace + 1);
      try { return JSON.parse(chunk); } catch (_) {}
      try { return JSON.parse(cleanTrailingCommas(chunk)); } catch (_) {}
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER 1: OpenRouter (Priority 1)
// ═══════════════════════════════════════════════════════════════════════════
async function callOpenRouter(prompt, imageUrl = null, model = null, options = {}, maxRetries = null) {
  // DB-configured key/base_url win when provided; otherwise fall back to env.
  const apiKey = (options.apiKey || process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not defined in .env');
  const apiUrl = options.baseUrl || OPENROUTER_API_URL;

  const primaryModel = model || process.env.OPENROUTER_MODEL || 'openrouter/free';
  const modelsToTry = [primaryModel, ...OPENROUTER_FALLBACK_MODELS.filter((m) => m !== primaryModel)];
  // Try every candidate model at least once (primary + fallbacks), not just 2.
  const maxAttempts = maxRetries != null ? maxRetries : modelsToTry.length;

  const contentParts = [];
  if (imageUrl) {
    contentParts.push({ type: 'image_url', image_url: { url: imageUrl } });
  }
  contentParts.push({ type: 'text', text: prompt });

  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentModel = modelsToTry[attempt % modelsToTry.length];
    const payload = {
      model: currentModel,
      messages: [{ role: 'user', content: imageUrl ? contentParts : prompt }],
      temperature: options.temperature !== undefined ? Number(options.temperature) : 0.2,
      max_tokens: options.max_tokens ? Number(options.max_tokens) : 4096,
    };

    try {
      console.log(`[OpenRouter] Sending request → model: ${currentModel} (Attempt ${attempt + 1}/${maxAttempts})`);
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://spotme.app',
          'X-Title': 'SpotMe Workout AI',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (content !== undefined && content !== null) return content;
      throw new Error('Empty response content from OpenRouter');
    } catch (err) {
      lastError = err;
      const statusCode = err.response?.status;
      const responseData = err.response?.data;
      const errorMsg = responseData?.error?.message || '';

      console.warn(
        `[OpenRouter] Attempt ${attempt + 1} failed — status ${statusCode || err.code || 'UNKNOWN'}\n` +
        `  -> Model: ${currentModel}\n` +
        `  -> Response: ${JSON.stringify(responseData || err.message)}`
      );

      // If account-level daily free tier quota is exhausted, fail fast over to Gemini
      if (errorMsg.includes('free-models-per-day') || responseData?.error?.metadata?.limit_source === 'openrouter_free_tier_daily') {
        console.warn('[OpenRouter] Daily free limit exhausted. Fast-failing immediately to Google Gemini...');
        break;
      }

      // Invalid / unknown / unavailable model (e.g. admin saved a removed
      // ':free' id like z-ai/glm-5.2:free) → try next candidate model
      // instead of failing the whole provider on the first 400/404.
      const isModelError = statusCode === 400 || statusCode === 404;
      if (isModelError && attempt < maxAttempts - 1) {
        console.warn(`[OpenRouter] Model ${currentModel} rejected (${statusCode}). Trying next fallback model...`);
        continue;
      }

      const isRetryable = statusCode === 429 || (statusCode >= 500 && statusCode <= 504) || err.code === 'ECONNABORTED';
      if (isRetryable && attempt < maxAttempts - 1) {
        const backoffMs = 1500 * (attempt + 1);
        await sleep(backoffMs);
        continue;
      }
      // Non-retryable error on the last candidate (or single-model case).
      // If more candidates remain untested, keep going; else stop.
      if (attempt < maxAttempts - 1) continue;
      break;
    }
  }

  throw lastError || new Error('OpenRouter call failed');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER 2: Google Gemini (Priority 2)
// ═══════════════════════════════════════════════════════════════════════════
async function callGemini(prompt, imageUrl = null, model = null, options = {}) {
  // DB-configured key/base_url win when provided; otherwise fall back to env.
  const apiKey = (options.apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined in .env');
  const apiBase = (options.baseUrl || GEMINI_API_BASE).replace(/\/$/, '');

  const primaryModel = model || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const modelsToTry = [primaryModel, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  let lastError = null;

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const currentModel = modelsToTry[attempt];
    const url = `${apiBase}/${currentModel}:generateContent?key=${apiKey}`;

    const parts = [];
    if (imageUrl) {
      try {
        const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
        const contentType = imgResponse.headers['content-type'] || 'image/jpeg';
        const base64Data = Buffer.from(imgResponse.data).toString('base64');
        parts.push({ inlineData: { mimeType: contentType, data: base64Data } });
      } catch (imgErr) {
        console.warn('[Gemini] Failed to fetch image, proceeding with text only:', imgErr.message);
      }
    }
    parts.push({ text: prompt });

    const payload = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: options.temperature !== undefined ? Number(options.temperature) : 0.2,
        maxOutputTokens: options.max_tokens ? Number(options.max_tokens) : 4096,
      },
    };

    try {
      console.log(`[Gemini] Sending request → model: ${currentModel} (Attempt ${attempt + 1}/${modelsToTry.length})`);
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text !== undefined && text !== null && text.trim() !== '') return text;
      throw new Error('Empty response from Gemini');
    } catch (err) {
      lastError = err;
      const statusCode = err.response?.status;
      const responseData = err.response?.data;

      console.warn(
        `[Gemini] Model ${currentModel} failed — status ${statusCode || err.code || 'UNKNOWN'}\n` +
        `  -> Response: ${JSON.stringify(responseData || err.message)}`
      );

      // If rate limited, busy, unknown model, or bad request for this model,
      // try the next model in the chain (admin may have saved a removed id).
      if ((statusCode === 400 || statusCode === 404 || statusCode === 429 || statusCode === 503) && attempt < modelsToTry.length - 1) {
        if (statusCode === 429 || statusCode === 503) await sleep(1000);
        continue;
      }
    }
  }

  throw lastError || new Error('Gemini call failed on all available models');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER 3: Groq (Priority 3 - Last Resort)
// ═══════════════════════════════════════════════════════════════════════════
async function callGroq(prompt, imageUrl = null, model = null, options = {}) {
  // DB-configured key/base_url win when provided; otherwise fall back to env.
  const groqKey = (options.apiKey || process.env.GROQ_API_KEY || '').trim();
  if (!groqKey) throw new Error('GROQ_API_KEY is not defined in .env');
  const apiUrl = options.baseUrl || GROQ_API_URL;

  // Honor an admin-assigned primary model first, then the built-in fallbacks.
  const primaryModel = model || null;
  const modelsToTry = primaryModel
    ? [primaryModel, ...GROQ_FALLBACK_MODELS.filter((m) => m !== primaryModel)]
    : [...GROQ_FALLBACK_MODELS];
  let lastError = null;

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const groqModel = modelsToTry[attempt];
    let messages;

    if (imageUrl) {
      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ];
    } else {
      messages = [{ role: 'user', content: prompt }];
    }

    const payload = {
      model: groqModel,
      messages,
      temperature: options.temperature !== undefined ? Number(options.temperature) : 0.3,
      max_tokens: options.max_tokens ? Number(options.max_tokens) : 4096,
    };

    try {
      console.log(`[Groq] Sending request → model: ${groqModel} (Attempt ${attempt + 1}/${modelsToTry.length})`);
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (content) return content;
      throw new Error('Empty response from Groq');
    } catch (err) {
      lastError = err;
      const statusCode = err.response?.status;
      console.warn(`[Groq] Model ${groqModel} failed (${statusCode}):`, JSON.stringify(err.response?.data || err.message));
      if (attempt < modelsToTry.length - 1) continue;
    }
  }

  throw lastError || new Error('Groq call failed on all models');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT — Config-driven, task-key based AI router
//
// callAI(prompt, imageUrl, taskKey, options)
//
//   taskKey: one of the keys in ai_task_configs table
//            e.g. 'coach_chat', 'meal_analysis', 'workout_split_generate'
//            Defaults to 'coach_chat' if omitted (backward compatible).
//
// How it works:
//   1. Load the task config from aiConfig (fresh from DB, no cache).
//   2. Pick the provider based on task's primary_model_id → provider_name.
//   3. Call that provider's function.
//   4. On failure, cascade to Gemini then Groq as before.
//   5. Log each attempt (success or fail) to ai_usage_logs via aiLogger.
// ═══════════════════════════════════════════════════════════════════════════
async function callAI(prompt, imageUrl = null, taskKey = 'coach_chat', options = {}) {
  const startTime = Date.now();

  // Try to load DB config for this task.
  // Falls back gracefully to env-based defaults if DB is unavailable or task unknown.
  let taskCfg = null;
  try {
    taskCfg = await getTaskConfig(taskKey);
  } catch (cfgErr) {
    console.warn(`[AI] Failed to load task config for '${taskKey}', using env defaults:`, cfgErr.message);
  }

  // Merge DB config into options (DB config wins over caller hardcoded defaults).
  // Caller `options` are used only as fallback when DB has no value.
  const { apiKey: _dropApiKey, baseUrl: _dropBaseUrl, api_key: _dropSnakeKey, base_url: _dropSnakeUrl, ...safeOptions } = options || {};
  const callOptions = {
    ...safeOptions,
    temperature: taskCfg?.temperature != null ? Number(taskCfg.temperature) : (options.temperature !== undefined ? Number(options.temperature) : 0.2),
    max_tokens:  taskCfg?.max_tokens != null  ? Number(taskCfg.max_tokens)  : (options.max_tokens ? Number(options.max_tokens) : 4096),
  };
  if (callOptions.temperature !== undefined) callOptions.temperature = Number(callOptions.temperature);
  if (callOptions.max_tokens !== undefined)  callOptions.max_tokens  = Number(callOptions.max_tokens);
  // DB credentials win when present; otherwise keep env-based provider functions.
  if (taskCfg?.api_key) callOptions.apiKey = taskCfg.api_key;
  if (taskCfg?.base_url) callOptions.baseUrl = taskCfg.base_url;

  // Helper: extract cleanest descriptive error message from provider
  const getErrMsg = (err) =>
    err.response?.data?.error?.message ||
    err.response?.data?.message ||
    (typeof err.response?.data === 'string' ? err.response.data : null) ||
    err.message ||
    'Unknown error';

  // Provider name from DB config; falls back to 'openrouter' if unknown.
  // Normalized so admin-created names like 'Gemini' / 'GEMINI' still route correctly.
  const preferredProvider = String(taskCfg?.provider_name || 'openrouter').toLowerCase().trim();
  const preferredModel    = taskCfg?.model_id       || null;

  // Helper: log one attempt result to ai_usage_logs.
  const log = (providerName, modelUsed, success, completionText = null, errorMessage = null) => {
    logUsage({
      taskKey,
      providerName,
      modelUsed: modelUsed || 'unknown',
      promptText:    prompt,
      completionText,
      latencyMs:  Date.now() - startTime,
      inputCostPerM:  taskCfg?.input_cost_per_m  || 0,
      outputCostPerM: taskCfg?.output_cost_per_m || 0,
      success,
      errorMessage,
    });
  };

  // ── TIER 1: Preferred provider from DB config ──────────────────────────────
  // Try the admin-assigned provider first. This respects whatever the admin set.
  if (preferredProvider === 'gemini') {
    try {
      const result = await callGemini(prompt, imageUrl, preferredModel, callOptions);
      log('gemini', preferredModel || 'gemini-3.1-flash-lite', true, result);
      return result;
    } catch (err) {
      const errMsg = getErrMsg(err);
      console.warn(`[AI] Primary provider gemini failed for '${taskKey}':`, errMsg);
      log('gemini', preferredModel, false, null, errMsg);
    }
  } else if (preferredProvider === 'groq') {
    try {
      const result = await callGroq(prompt, imageUrl, preferredModel, callOptions);
      log('groq', preferredModel || GROQ_FALLBACK_MODELS[0], true, result);
      return result;
    } catch (err) {
      const errMsg = getErrMsg(err);
      console.warn(`[AI] Primary provider groq failed for '${taskKey}':`, errMsg);
      log('groq', preferredModel, false, null, errMsg);
    }
  } else {
    // Default: OpenRouter
    try {
      const result = await callOpenRouter(prompt, imageUrl, preferredModel, callOptions);
      log('openrouter', preferredModel || 'openrouter/free', true, result);
      return result;
    } catch (err) {
      const errMsg = getErrMsg(err);
      console.warn(`[AI] Primary provider openrouter failed for '${taskKey}':`, errMsg);
      log('openrouter', preferredModel, false, null, errMsg);
    }
  }

  // ── TIER 2: Gemini fallback (skip if already tried above) ─────────────────
  if (preferredProvider !== 'gemini') {
    try {
      console.info(`[AI] Falling back to Gemini for '${taskKey}'...`);
      const result = await callGemini(prompt, imageUrl, null, callOptions);
      log('gemini', 'gemini-3.1-flash-lite', true, result);
      return result;
    } catch (err) {
      const errMsg = getErrMsg(err);
      console.warn(`[AI] Gemini fallback also failed for '${taskKey}':`, errMsg);
      log('gemini', 'gemini-3.1-flash-lite', false, null, errMsg);
    }
  }

  // ── TIER 3: Groq last resort (skip if already tried above) ────────────────
  if (preferredProvider !== 'groq') {
    try {
      console.info(`[AI] Falling back to Groq (last resort) for '${taskKey}'...`);
      const result = await callGroq(prompt, imageUrl, null, callOptions);
      log('groq', GROQ_FALLBACK_MODELS[0], true, result);
      return result;
    } catch (err) {
      const errMsg = getErrMsg(err);
      console.error(`[AI] ❌ All providers failed for '${taskKey}':`, errMsg);
      log('groq', GROQ_FALLBACK_MODELS[0], false, null, errMsg);
    }
  }

  throw new Error(`AI call failed on all providers for task '${taskKey}'`);
}

module.exports = {
  callAI,
  callOpenRouter,
  callGemini,
  callGroq,
  extractJson,
};
