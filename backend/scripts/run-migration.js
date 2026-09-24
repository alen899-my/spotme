'use strict';

/**
 * run-migration.js — Runs migrations/002_ai_config_system.sql against the Neon DB.
 *
 * What this script does (in order):
 *  1. Creates 4 new tables (ai_providers, ai_models, ai_task_configs, ai_usage_logs)
 *  2. Seeds the 3 providers with API keys from .env
 *  3. Seeds all known models per provider
 *  4. Sets primary_model_id on each task config to Gemini 3.1 Flash Lite
 *  5. Prints a verification summary
 *
 * Usage: node scripts/run-migration.js
 * Safe to re-run (all inserts use ON CONFLICT DO NOTHING / DO UPDATE).
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Model definitions (matches what utils/ai.js uses) ────────────────────────

const MODELS = {
  openrouter: [
    { model_id: 'openrouter/free',                                display_name: 'OpenRouter Free (Auto)',        supports_vision: false, context_window: 32768,   max_output_tokens: 4096, input_cost_per_m: 0,     output_cost_per_m: 0,    rpm_limit: 20,  rpd_limit: 200   },
    { model_id: 'meta-llama/llama-3.3-70b-instruct:free',         display_name: 'Llama 3.3 70B (Free)',          supports_vision: false, context_window: 131072,  max_output_tokens: 4096, input_cost_per_m: 0,     output_cost_per_m: 0,    rpm_limit: 20,  rpd_limit: 200   },
    { model_id: 'mistralai/mistral-small-24b-instruct-2501:free',  display_name: 'Mistral Small 24B (Free)',      supports_vision: false, context_window: 32768,   max_output_tokens: 4096, input_cost_per_m: 0,     output_cost_per_m: 0,    rpm_limit: 20,  rpd_limit: 200   },
    { model_id: 'qwen/qwen-2.5-72b-instruct:free',                display_name: 'Qwen 2.5 72B (Free)',           supports_vision: false, context_window: 32768,   max_output_tokens: 4096, input_cost_per_m: 0,     output_cost_per_m: 0,    rpm_limit: 20,  rpd_limit: 200   },
  ],
  gemini: [
    { model_id: 'gemini-3.1-flash-lite', display_name: 'Gemini 3.1 Flash Lite', supports_vision: true,  context_window: 1048576, max_output_tokens: 8192, input_cost_per_m: 0.075, output_cost_per_m: 0.30, rpm_limit: 15, rpd_limit: 500   },
    { model_id: 'gemini-3.5-flash-lite', display_name: 'Gemini 3.5 Flash Lite', supports_vision: true,  context_window: 1048576, max_output_tokens: 8192, input_cost_per_m: 0.075, output_cost_per_m: 0.30, rpm_limit: 15, rpd_limit: 500   },
    { model_id: 'gemma-4-31b-it',        display_name: 'Gemma 4 31B',           supports_vision: false, context_window: 128000,  max_output_tokens: 8192, input_cost_per_m: 0,     output_cost_per_m: 0,    rpm_limit: 30, rpd_limit: 14400 },
    { model_id: 'gemini-3.5-flash',      display_name: 'Gemini 3.5 Flash',      supports_vision: true,  context_window: 1048576, max_output_tokens: 8192, input_cost_per_m: 0.15,  output_cost_per_m: 0.60, rpm_limit: 5,  rpd_limit: 20    },
    { model_id: 'gemini-3.7-flash',      display_name: 'Gemini 3.7 Flash',      supports_vision: true,  context_window: 1048576, max_output_tokens: 8192, input_cost_per_m: 0.15,  output_cost_per_m: 0.60, rpm_limit: 5,  rpd_limit: 20    },
    { model_id: 'gemini-3.8-flash',      display_name: 'Gemini 3.8 Flash',      supports_vision: true,  context_window: 1048576, max_output_tokens: 8192, input_cost_per_m: 0.15,  output_cost_per_m: 0.60, rpm_limit: 5,  rpd_limit: 20    },
  ],
  groq: [
    { model_id: 'openai/gpt-oss-120b', display_name: 'GPT OSS 120B',  supports_vision: false, context_window: 131072, max_output_tokens: 4096, input_cost_per_m: 0.59, output_cost_per_m: 0.79, rpm_limit: 30, rpd_limit: 14400 },
    { model_id: 'qwen/qwen3.8-27b',    display_name: 'Qwen 3.8 27B',  supports_vision: false, context_window: 131072, max_output_tokens: 4096, input_cost_per_m: 0.59, output_cost_per_m: 0.79, rpm_limit: 30, rpd_limit: 14400 },
    { model_id: 'openai/gpt-oss-20b',  display_name: 'GPT OSS 20B',   supports_vision: false, context_window: 131072, max_output_tokens: 4096, input_cost_per_m: 0.59, output_cost_per_m: 0.79, rpm_limit: 30, rpd_limit: 14400 },
    { model_id: 'groq/compound',        display_name: 'Groq Compound', supports_vision: false, context_window: 131072, max_output_tokens: 4096, input_cost_per_m: 0,    output_cost_per_m: 0,    rpm_limit: 30, rpd_limit: 14400 },
  ],
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const client = await pool.connect();
  console.log('✅ Connected to Neon DB\n');

  try {
    // ── Step 1: Run DDL (CREATE TABLE / INDEX) ─────────────────────────────────
    const sqlPath = path.join(__dirname, '../migrations/002_ai_config_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Step 1 — Creating tables and indexes …');
    await client.query(sql);
    console.log('✅ Tables and indexes ready\n');

    // ── Step 2: Seed providers with keys from .env ─────────────────────────────
    console.log('⏳ Step 2 — Seeding providers …');
    const providerDefs = [
      { name: 'openrouter', display_name: 'OpenRouter',    base_url: 'https://openrouter.ai/api/v1/chat/completions',           api_key: process.env.OPENROUTER_API_KEY, priority: 1 },
      { name: 'gemini',     display_name: 'Google Gemini', base_url: 'https://generativelanguage.googleapis.com/v1beta/models',  api_key: process.env.GEMINI_API_KEY,     priority: 2 },
      { name: 'groq',       display_name: 'Groq LPU',     base_url: 'https://api.groq.com/openai/v1/chat/completions',          api_key: process.env.GROQ_API_KEY,       priority: 3 },
    ];

    for (const p of providerDefs) {
      await client.query(
        `INSERT INTO ai_providers (name, display_name, base_url, api_key, priority)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           base_url     = EXCLUDED.base_url,
           api_key      = COALESCE(EXCLUDED.api_key, ai_providers.api_key),
           priority     = EXCLUDED.priority,
           updated_at   = NOW()`,
        [p.name, p.display_name, p.base_url, p.api_key || null, p.priority]
      );
      const keyStatus = p.api_key ? '🔑' : '⚠️  no key in .env';
      console.log(`  ${keyStatus}  ${p.display_name} (priority ${p.priority})`);
    }
    console.log('✅ Providers seeded\n');

    // ── Step 3: Seed models ────────────────────────────────────────────────────
    console.log('⏳ Step 3 — Seeding models …');
    let modelCount = 0;
    for (const [providerName, models] of Object.entries(MODELS)) {
      // Get provider ID
      const provRes = await client.query('SELECT id FROM ai_providers WHERE name = $1', [providerName]);
      if (!provRes.rows.length) {
        console.log(`  ⚠️  Provider '${providerName}' not found — skipping its models`);
        continue;
      }
      const providerId = provRes.rows[0].id;

      for (const m of models) {
        await client.query(
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
             updated_at        = NOW()`,
          [
            providerId, m.model_id, m.display_name, m.supports_vision,
            m.context_window, m.max_output_tokens, m.input_cost_per_m,
            m.output_cost_per_m, m.rpm_limit, m.rpd_limit,
          ]
        );
        modelCount++;
      }
      console.log(`  ✅ ${providerName.padEnd(12)} — ${models.length} models`);
    }
    console.log(`✅ ${modelCount} models seeded\n`);

    // ── Step 4: Assign default model (Gemini 3.1 Flash Lite) to all tasks ──────
    // This is the model that will be used until admin changes it from the panel.
    console.log('⏳ Step 4 — Assigning default model to task configs …');
    const defaultModelRes = await client.query(
      `SELECT am.id FROM ai_models am
       JOIN ai_providers ap ON ap.id = am.provider_id
       WHERE ap.name = 'gemini' AND am.model_id = 'gemini-3.1-flash-lite'
       LIMIT 1`
    );

    if (defaultModelRes.rows.length) {
      const defaultModelId = defaultModelRes.rows[0].id;
      await client.query(
        `UPDATE ai_task_configs SET primary_model_id = $1 WHERE primary_model_id IS NULL`,
        [defaultModelId]
      );
      console.log(`  ✅ Default model set: gemini-3.1-flash-lite (id: ${defaultModelId})`);
    } else {
      console.log('  ⚠️  Default model not found — tasks will use env fallback until admin assigns one');
    }
    console.log('');

    // ── Step 5: Verification summary ──────────────────────────────────────────
    console.log('📋 Verification summary:');
    for (const table of ['ai_providers', 'ai_models', 'ai_task_configs', 'ai_usage_logs']) {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS cnt FROM ${table}`);
      console.log(`  ✅ ${table.padEnd(22)} — ${rows[0].cnt} rows`);
    }

    console.log('\n📋 Task configs:');
    const { rows: tasks } = await client.query(
      `SELECT tc.task_key, tc.is_enabled, am.model_id, ap.name AS provider
       FROM ai_task_configs tc
       LEFT JOIN ai_models   am ON am.id = tc.primary_model_id
       LEFT JOIN ai_providers ap ON ap.id = am.provider_id
       ORDER BY tc.task_key`
    );
    for (const t of tasks) {
      const status = t.is_enabled ? '✅' : '❌';
      console.log(`  ${status} ${t.task_key.padEnd(30)} → [${t.provider || 'none'}] ${t.model_id || 'not assigned'}`);
    }

    console.log('\n🎉 Migration 002 complete. AI config system is live.');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
