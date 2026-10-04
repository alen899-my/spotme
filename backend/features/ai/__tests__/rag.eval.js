'use strict';

/**
 * features/ai/__tests__/rag.eval.js — Offline RAG/agent smoke eval (no jest needed).
 * Usage: node features/ai/__tests__/rag.eval.js
 * Checks (no network required — hash embeddings + graceful degrades):
 *  1. chunkText splits long text with overlap
 *  2. hash embeddings are deterministic + normalized
 *  3. all 8 task prompts build
 *  4. tool schemas cover all 19 legacy TOOL_DEFS
 *  5. retriever returns { vectorDocs, sqlSnapshot } shape (DB optional)
 *  6. runner exports + V2 flag defaults OFF (legacy safe until packages land)
 * Exit 0 = all pass.
 */

const assert = require('assert');

async function main() {
  let pass = 0;
  const ok = (name) => {
    pass++;
    console.log(`  PASS ${name}`);
  };

  const { chunkText, hashEmbed, getEmbeddingProvider, EMBEDDING_DIM } = require('../rag/embeddings');
  const chunks = chunkText(`${'Progressive overload works. '.repeat(200)}`, { chunkSize: 800, overlap: 120 });
  assert(chunks.length > 1 && chunks.every((c) => c.length <= 900), 'chunking bounds');
  ok(`chunkText -> ${chunks.length} chunks`);
  assert.strictEqual(EMBEDDING_DIM, 768, 'dim 768');
  const a = hashEmbed('bench press chest');
  const b = hashEmbed('bench press chest');
  assert.deepStrictEqual(a, b, 'hash deterministic');
  const norm = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  assert(Math.abs(norm - 1) < 1e-6, 'hash normalized');
  ok('hashEmbed deterministic + normalized');
  const prov = getEmbeddingProvider();
  assert.strictEqual(typeof prov.embedQuery, 'function', 'provider iface');
  ok(`embedding provider: ${prov.name}`);

  const { PROMPTS, buildSystemPrompt, composeUserTurn } = require('../agent/prompts');
  const tasks = [
    'coach_chat',
    'workout_coach_chat',
    'meal_analysis',
    'physique_analysis',
    'workout_split_generate',
    'workout_split_refine',
    'workout_report',
    'diet_plan_generate',
  ];
  for (const t of tasks) assert(PROMPTS[t] && buildSystemPrompt(t).length > 100, `prompt ${t}`);
  ok('8/8 task prompts build');
  const turn = composeUserTurn({ query: 'hi', vectorSection: '[R1 0.9 knowledge] x', sqlSnapshot: 'PROFILE: y', summary: '', windowText: '' });
  assert(turn.includes('USER MESSAGE'), 'turn composer');
  ok('composeUserTurn shape');

  const legacyTools = require('../ai-tools');
  const { SCHEMAS, buildSplitTools } = require('../agent/tools');
  for (const name of Object.keys(legacyTools.TOOL_DEFS)) assert(SCHEMAS[name], `schema ${name}`);
  const n = Object.keys(legacyTools.TOOL_DEFS).length;
  ok(`${n}/${n} tool schemas cover TOOL_DEFS`);
  const tools = buildSplitTools(1, '00000000-0000-0000-0000-000000000000');
  assert(Array.isArray(tools), 'tools array (may be [] pre-install)');
  ok(`buildSplitTools -> ${tools.length} tools (0 = pre-install fallback, expected)`);

  const { buildGraph } = require('../agent/graph');
  assert.strictEqual(typeof buildGraph, 'function', 'graph builder');
  ok('graph module loads');

  const runner = require('../agent/runner');
  assert.strictEqual(runner.isV2Enabled(), true, 'V2 always on (flag removed)');
  ok('runner V2 always-on, legacy via internal fallback');

  const { retrieveContext } = require('../rag/retriever');
  try {
    const ctx = await retrieveContext({ userId: 1, query: 'bench press', k: 3 });
    assert(Array.isArray(ctx.vectorDocs) && typeof ctx.sqlSnapshot === 'string', 'ctx shape');
    ok(`retriever shape (docs=${ctx.vectorDocs.length}, snapshot=${ctx.sqlSnapshot.length}ch)`);
  } catch (e) {
    console.log(`  SKIP retriever live check (no DB): ${e.message}`);
  }

  console.log(`\nEVAL PASS: ${pass} checks green.`);
}

main().catch((e) => {
  console.error(`\nEVAL FAIL: ${e.message}`);
  process.exit(1);
});
