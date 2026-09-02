const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

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
async function callOpenRouter(prompt, imageUrl = null, model = null, options = {}, maxRetries = 2) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not defined in .env');

  const primaryModel = model || process.env.OPENROUTER_MODEL || 'openrouter/free';
  const modelsToTry = [primaryModel, ...OPENROUTER_FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  const contentParts = [];
  if (imageUrl) {
    contentParts.push({ type: 'image_url', image_url: { url: imageUrl } });
  }
  contentParts.push({ type: 'text', text: prompt });

  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const currentModel = modelsToTry[attempt % modelsToTry.length];
    const payload = {
      model: currentModel,
      messages: [{ role: 'user', content: imageUrl ? contentParts : prompt }],
      temperature: options.temperature !== undefined ? options.temperature : 0.2,
      max_tokens: options.max_tokens || 4096,
    };

    try {
      console.log(`[OpenRouter] Sending request → model: ${currentModel} (Attempt ${attempt + 1}/${maxRetries})`);
      const response = await axios.post(OPENROUTER_API_URL, payload, {
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

      const isRetryable = statusCode === 429 || (statusCode >= 500 && statusCode <= 504) || err.code === 'ECONNABORTED';
      if (isRetryable && attempt < maxRetries - 1) {
        const backoffMs = 1500 * (attempt + 1);
        await sleep(backoffMs);
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('OpenRouter call failed');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER 2: Google Gemini (Priority 2)
// ═══════════════════════════════════════════════════════════════════════════
async function callGemini(prompt, imageUrl = null, model = null, options = {}) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined in .env');

  const primaryModel = model || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const modelsToTry = [primaryModel, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  let lastError = null;

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const currentModel = modelsToTry[attempt];
    const url = `${GEMINI_API_BASE}/${currentModel}:generateContent?key=${apiKey}`;

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
        temperature: options.temperature !== undefined ? options.temperature : 0.2,
        maxOutputTokens: options.max_tokens || 4096,
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

      // If rate limited or service busy (429, 503), try next model in available chain
      if ((statusCode === 429 || statusCode === 503) && attempt < modelsToTry.length - 1) {
        await sleep(1000);
        continue;
      }
      if (statusCode === 404 && attempt < modelsToTry.length - 1) {
        continue; // Try next model immediately
      }
    }
  }

  throw lastError || new Error('Gemini call failed on all available models');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER 3: Groq (Priority 3 - Last Resort)
// ═══════════════════════════════════════════════════════════════════════════
async function callGroq(prompt, imageUrl = null, model = null, options = {}) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY is not defined in .env');

  const modelsToTry = GROQ_FALLBACK_MODELS;
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
      temperature: options.temperature !== undefined ? options.temperature : 0.3,
      max_tokens: options.max_tokens || 4096,
    };

    try {
      console.log(`[Groq] Sending request → model: ${groqModel} (Attempt ${attempt + 1}/${modelsToTry.length})`);
      const response = await axios.post(GROQ_API_URL, payload, {
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
// MAIN ENTRY POINT — 1. OpenRouter → 2. Gemini → 3. Groq
// ═══════════════════════════════════════════════════════════════════════════
async function callAI(prompt, imageUrl = null, model = null, options = {}) {
  // ── TIER 1: OpenRouter (Priority 1) ──
  try {
    const result = await callOpenRouter(prompt, imageUrl, model, options);
    return result;
  } catch (openRouterError) {
    console.warn(
      '[AI Service] OpenRouter failed. Falling back to Google Gemini.\n' +
      `  -> Reason: ${openRouterError.response?.data?.error?.message || openRouterError.message}`
    );
  }

  // ── TIER 2: Google Gemini (Priority 2) ──
  try {
    console.info('[AI Service] Attempting Google Gemini provider...');
    const geminiResult = await callGemini(prompt, imageUrl, null, options);
    console.info('[AI Service] ✅ Successfully generated response via Google Gemini');
    return geminiResult;
  } catch (geminiError) {
    console.warn(
      '[AI Service] Gemini also failed. Falling back to Groq (Last Resort).\n' +
      `  -> Reason: ${geminiError.response?.data?.error?.message || geminiError.message}`
    );
  }

  // ── TIER 3: Groq (Priority 3 - Last Resort) ──
  try {
    console.info('[AI Service] Attempting Groq provider...');
    const groqResult = await callGroq(prompt, imageUrl, null, options);
    console.info('[AI Service] ✅ Successfully generated response via Groq');
    return groqResult;
  } catch (groqError) {
    console.error(
      '[AI Service] ❌ All three providers failed.\n' +
      `  -> Groq error: ${JSON.stringify(groqError.response?.data || groqError.message)}`
    );
    throw new Error('AI analysis failed on all providers (OpenRouter → Gemini → Groq)');
  }
}

module.exports = {
  callAI,
  callOpenRouter,
  callGemini,
  callGroq,
  extractJson,
};
