'use strict';

/**
 * aiLogger.js — Writes one row to ai_usage_logs after every AI API call.
 *
 * Logging is fire-and-forget (non-blocking). If the insert fails it only
 * prints a warning — it must never crash the main AI response path.
 *
 * Usage:
 *   const { logUsage } = require('./aiLogger');
 *   await logUsage({ taskKey, userId, providerName, modelUsed,
 *                    promptTokens, completionTokens, latencyMs,
 *                    inputCostPerM, outputCostPerM, success, errorMessage });
 */

const { pool } = require('../db');

/**
 * estimateCost(promptTokens, completionTokens, inputCostPerM, outputCostPerM)
 * Returns the estimated USD cost for one API call.
 * Falls back to 0 when cost rates are unknown (free-tier models).
 */
function estimateCost(promptTokens = 0, completionTokens = 0, inputCostPerM = 0, outputCostPerM = 0) {
  const inCost  = (promptTokens     / 1_000_000) * (inputCostPerM  || 0);
  const outCost = (completionTokens / 1_000_000) * (outputCostPerM || 0);
  return +(inCost + outCost).toFixed(8); // round to 8 decimal places
}

/**
 * estimateTokens(text)
 * Rough token estimate when the API doesn't return usage stats.
 * Rule of thumb: 1 token ≈ 4 characters in English text.
 */
function estimateTokens(text = '') {
  return Math.round(String(text).length / 4);
}

/**
 * logUsage(params)
 * Inserts one row into ai_usage_logs. All fields are optional except the
 * required identifiers — missing values are stored as NULL.
 *
 * params.promptTokens / completionTokens: pass actual values from response.usage
 * when available (OpenRouter and Groq always return them). For Gemini or when
 * unknown, pass the prompt/response text so we can estimate via estimateTokens().
 */
async function logUsage({
  taskKey,
  userId          = null,
  providerName,
  modelUsed,
  promptTokens    = null,  // actual token count from API response, if available
  completionTokens = null,
  promptText      = null,  // fallback: raw prompt string for token estimation
  completionText  = null,  // fallback: raw completion string for token estimation
  latencyMs       = null,
  inputCostPerM   = 0,
  outputCostPerM  = 0,
  success         = true,
  errorMessage    = null,
}) {
  // Use actual token counts from the API when present; otherwise estimate.
  const finalPromptTokens     = promptTokens     ?? estimateTokens(promptText);
  const finalCompletionTokens = completionTokens ?? estimateTokens(completionText);
  const totalTokens           = finalPromptTokens + finalCompletionTokens;
  const costUsd               = estimateCost(finalPromptTokens, finalCompletionTokens, inputCostPerM, outputCostPerM);

  // Non-blocking insert — never throws.
  pool.query(
    `INSERT INTO ai_usage_logs
      (task_key, user_id, provider_name, model_used,
       prompt_tokens, completion_tokens, total_tokens,
       latency_ms, cost_usd, success, error_message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      taskKey, userId, providerName, modelUsed,
      finalPromptTokens, finalCompletionTokens, totalTokens,
      latencyMs, costUsd, success, errorMessage,
    ]
  ).catch((err) => {
    // Log warning but never propagate — logging must not break the response.
    console.warn('[aiLogger] Failed to write usage log:', err.message);
  });
}

module.exports = { logUsage, estimateCost, estimateTokens };
