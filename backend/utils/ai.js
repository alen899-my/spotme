const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

// ── API Endpoints ────────────────────────────────────────────────────────────
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── OpenRouter free model fallback chain ─────────────────────────────────────
// Tried in order on 429 / 5xx errors
const OPENROUTER_FALLBACK_MODELS = [
  'openrouter/free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'qwen/qwen-2.5-72b-instruct:free',
];

// ── Gemini model fallback chain (highest RPM limit first) ────────────────────
// Only models with RPM > 0 from your account are listed here.
// Models: RPM listed in parentheses
const GEMINI_FALLBACK_MODELS = [
  'gemini-3.1-flash-lite-latest',    // 15 RPM, 250K TPM
  'gemini-3.5-flash-lite-latest',    // 15 RPM, 250K TPM
  'gemini-2.5-flash-lite-latest',    // 10 RPM, 250K TPM
  'gemini-3.8-flash-latest',         // 5 RPM, 250K TPM
  'gemini-3.7-flash-latest',         // 5 RPM, 250K TPM
  'gemini-3.6-flash-latest',         // 5 RPM, 250K TPM
  'gemini-3.5-flash-latest',         // 5 RPM, 250K TPM
  'gemini-3-flash-latest',           // 5 RPM, 250K TPM
  'gemini-2.5-flash-latest',         // 5 RPM, 250K TPM
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════════════════════
// JSON Extractor (handles markdown fences, brackets, raw JSON)
// ═══════════════════════════════════════════════════════════════════════════
function extractJson(text) {
  if (!text) return null;
  if (typeof text === 'object') return text;

  const raw = String(text).trim();

  try { return JSON.parse(raw); } catch (_) {}

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try { return JSON.parse(fencedMatch[1].trim()); } catch (_) {}
  }

  const firstBrace = raw.indexOf('{');
  const firstBracket = raw.indexOf('[');

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = raw.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      try { return JSON.parse(raw.slice(firstBracket, lastBracket + 1)); } catch (_) {}
    }
  }

  if (firstBrace !== -1) {
    const lastBrace = raw.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      try { return JSON.parse(raw.slice(firstBrace, lastBrace + 1)); } catch (_) {}
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER 1: OpenRouter (Primary)
// ═══════════════════════════════════════════════════════════════════════════
async function callOpenRouter(prompt, imageUrl = null, model = null, options = {}, maxRetries = 3) {
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
        timeout: 90000,
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (content !== undefined && content !== null) return content;
      throw new Error('Empty response content from OpenRouter');
    } catch (err) {
      lastError = err;
      const statusCode = err.response?.status;
      const responseData = err.response?.data;
      const isRetryable = statusCode === 429 || (statusCode >= 500 && statusCode <= 504) || err.code === 'ECONNABORTED';

      console.warn(
        `[OpenRouter] Attempt ${attempt + 1} failed — status ${statusCode || err.code || 'UNKNOWN'}\n` +
        `  -> Model: ${currentModel}\n` +
        `  -> Response: ${JSON.stringify(responseData || err.message)}`
      );

      if (isRetryable && attempt < maxRetries - 1) {
        const backoffMs = 2000 * (attempt + 1);
        console.log(`[OpenRouter] Backing off ${backoffMs}ms before retry with alternate model...`);
        await sleep(backoffMs);
        continue;
      }
      break;
    }
  }

  throw lastError || new Error('OpenRouter call failed after all retries');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER 2: Google Gemini (Secondary Fallback)
// Uses Google's generateContent REST API, rotating through available models
// ═══════════════════════════════════════════════════════════════════════════
async function callGemini(prompt, imageUrl = null, model = null, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not defined in .env');

  const primaryModel = model || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-latest';
  const modelsToTry = [primaryModel, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  let lastError = null;

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const currentModel = modelsToTry[attempt];
    const url = `${GEMINI_API_BASE}/${currentModel}:generateContent?key=${apiKey}`;

    // Build parts for Gemini content API
    const parts = [];
    if (imageUrl) {
      // Fetch image as base64
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
        candidateCount: 1,
      },
    };

    try {
      console.log(`[Gemini] Sending request → model: ${currentModel} (Attempt ${attempt + 1}/${modelsToTry.length})`);
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 90000,
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text !== undefined && text !== null && text.trim() !== '') return text;
      throw new Error('Empty response from Gemini');
    } catch (err) {
      lastError = err;
      const statusCode = err.response?.status;
      const responseData = err.response?.data;
      const isRetryable = statusCode === 429 || statusCode === 503 || err.code === 'ECONNABORTED';

      console.warn(
        `[Gemini] Attempt ${attempt + 1} failed — status ${statusCode || err.code || 'UNKNOWN'}\n` +
        `  -> Model: ${currentModel}\n` +
        `  -> Response: ${JSON.stringify(responseData || err.message)}`
      );

      if (isRetryable && attempt < modelsToTry.length - 1) {
        const backoffMs = 1500 * (attempt + 1);
        console.log(`[Gemini] Backing off ${backoffMs}ms before trying next model...`);
        await sleep(backoffMs);
        continue;
      }
      if (!isRetryable) break; // Non-retryable error — skip to next model immediately
    }
  }

  throw lastError || new Error('Gemini call failed on all available models');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER 3: Groq (Last Resort Fallback)
// ═══════════════════════════════════════════════════════════════════════════
async function callGroq(prompt, imageUrl = null, model = null, options = {}) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY is not defined in .env');

  const groqModel = (model && model.includes('llama'))
    ? model
    : (imageUrl ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile');

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

  console.log(`[Groq] Sending request → model: ${groqModel}`);
  const response = await axios.post(GROQ_API_URL, payload, {
    headers: {
      'Authorization': `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  });

  return response.data?.choices?.[0]?.message?.content || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT — Priority: OpenRouter → Gemini → Groq
// ═══════════════════════════════════════════════════════════════════════════
async function callAI(prompt, imageUrl = null, model = null, options = {}) {
  // ── TIER 1: OpenRouter (Primary) ──
  try {
    const result = await callOpenRouter(prompt, imageUrl, model, options);
    return result;
  } catch (openRouterError) {
    console.warn(
      '[AI Service] OpenRouter failed. Attempting Gemini fallback.\n' +
      `  -> Error: ${JSON.stringify(openRouterError.response?.data || openRouterError.message)}`
    );
  }

  // ── TIER 2: Google Gemini ──
  try {
    console.info('[AI Service] Attempting Google Gemini provider...');
    const geminiResult = await callGemini(prompt, imageUrl, null, options);
    console.info('[AI Service] ✅ Recovered via Google Gemini');
    return geminiResult;
  } catch (geminiError) {
    console.warn(
      '[AI Service] Gemini also failed. Attempting Groq last-resort fallback.\n' +
      `  -> Error: ${JSON.stringify(geminiError.response?.data || geminiError.message)}`
    );
  }

  // ── TIER 3: Groq (Last Resort) ──
  try {
    console.info('[AI Service] Attempting Groq last-resort provider...');
    const groqResult = await callGroq(prompt, imageUrl, null, options);
    console.info('[AI Service] ✅ Recovered via Groq');
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
