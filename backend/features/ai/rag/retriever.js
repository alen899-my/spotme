'use strict';

/**
 * rag/retriever.js — Hybrid retrieval for the agent graph.
 *
 * Per turn, returns:
 *   { vectorDocs[], sqlSnapshot, summary, scores }
 *
 * - vectorDocs: pgvector top-k (global knowledge + this user's docs), MMR-lite
 *   diversity by source_id so one doc can't dominate.
 * - sqlSnapshot: small deterministic structured context (profile, targets,
 *   recent totals). Kept SEPARATE from ai.service's big dump on purpose —
 *   the graph caps it (~1k tokens) while vectors carry the long tail.
 * - Retrieval is logged best-effort to ai_retrieval_logs (eval/tracing).
 *
 * No require() of ai.service here (avoids load cycles) — snapshot queries
 * are intentionally duplicated in trimmed form.
 */

const { pool } = require('../../../db');
const { getEmbeddingProvider } = require('./embeddings');
const { similaritySearch } = require('./vectorstore');

const MAX_VECTOR_DOCS = 6;
const MAX_DOC_CHARS = 900;

function mmrLite(docs, limit = MAX_VECTOR_DOCS) {
  const picked = [];
  const seenSource = new Set();
  // Round 1: best doc per distinct source_id (diversity).
  for (const d of docs) {
    const key = `${d.source_type}:${d.source_id}`;
    if (!seenSource.has(key)) {
      seenSource.add(key);
      picked.push(d);
    }
    if (picked.length >= limit) break;
  }
  // Round 2: fill remainder by score if room.
  if (picked.length < limit) {
    for (const d of docs) {
      if (!picked.includes(d)) picked.push(d);
      if (picked.length >= limit) break;
    }
  }
  return picked.slice(0, limit).map((d) => ({
    ...d,
    content: String(d.content || '').slice(0, MAX_DOC_CHARS),
  }));
}

function formatVectorSection(docs) {
  if (!docs.length) return 'No indexed fitness documents matched this query.';
  return docs
    .map((d, i) => `[R${i + 1} ${(d.score || 0).toFixed(2)} ${d.source_type}] ${d.content}`)
    .join('\n');
}

/** Trimmed deterministic snapshot (~1k tokens): profile + targets + recent totals. */
async function buildSqlSnapshot(userId) {
  try {
    const [u, w, m, wt] = await Promise.all([
      pool.query(
        `SELECT username, full_name, age, gender, height, weight, fitness_goal,
                experience_level, activity_level, league_tier, total_xp, current_streak
         FROM users WHERE id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS n, COALESCE(SUM(total_volume),0)::int AS vol,
                COALESCE(SUM(calories_burned),0)::int AS kcal
         FROM daily_workouts
         WHERE user_id = $1 AND status = 'completed' AND completed_at >= NOW() - INTERVAL '14 days'`,
        [userId]
      ),
      pool.query(
        `SELECT calories_target, protein_target, carbs_target, fat_target, diet_type
         FROM meal_recommendations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT weight, TO_CHAR(logged_at,'YYYY-MM-DD') AS d FROM weight_logs
         WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 3`,
        [userId]
      ),
    ]);
    const user = u.rows[0] || {};
    const agg = w.rows[0] || {};
    const plan = m.rows[0] || null;
    const weights = wt.rows.map((r) => `${r.d}:${r.weight}kg`).join(', ') || 'none';
    return [
      `PROFILE: ${user.full_name || user.username || 'Lifter'} | goal ${user.fitness_goal || 'n/a'} | ${user.experience_level || 'n/a'} | ${user.weight || '?'}kg | streak ${user.current_streak || 0}d | ${user.league_tier || 'Bronze'} (${user.total_xp || 0}xp)`,
      `LAST14D: ${agg.n || 0} workouts | vol ${agg.vol || 0}kg | ${agg.kcal || 0}kcal`,
      plan
        ? `TARGETS: ${plan.calories_target || '?'}kcal P${plan.protein_target || '?'} C${plan.carbs_target || '?'} F${plan.fat_target || '?'} (${plan.diet_type || 'std'})`
        : 'TARGETS: none set',
      `WEIGHT: ${weights}`,
    ].join('\n');
  } catch (e) {
    console.warn(`[rag/retriever] sqlSnapshot failed: ${e.message}`);
    return 'Structured fitness snapshot unavailable.';
  }
}

async function logRetrieval({ sessionId, userId, taskKey, queryText, docs, latencyMs }) {
  try {
    await pool.query(
      `INSERT INTO ai_retrieval_logs (session_id, user_id, task_key, query_text, retrieved_ids, scores, latency_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        sessionId,
        userId,
        taskKey,
        String(queryText || '').slice(0, 2000),
        docs.map((d) => d.id),
        docs.map((d) => d.score || 0),
        latencyMs,
      ]
    );
  } catch (_) {
    // best-effort only
  }
}

/**
 * retrieveContext({ userId, sessionId, taskKey, query, k, sourceTypes })
 */
async function retrieveContext({ userId, sessionId = null, taskKey = 'coach_chat', query = '', k = MAX_VECTOR_DOCS, sourceTypes = null } = {}) {
  const t0 = Date.now();
  let vectorDocs = [];
  try {
    const provider = getEmbeddingProvider();
    const qvec = await provider.embedQuery(query);
    const raw = await similaritySearch({ queryEmbedding: qvec, userId, sourceTypes, k: (k || 6) + 4 });
    vectorDocs = mmrLite(raw, k || MAX_VECTOR_DOCS);
  } catch (e) {
    console.warn(`[rag/retriever] vector search failed, SQL-only: ${e.message}`);
  }
  const sqlSnapshot = await buildSqlSnapshot(userId);
  await logRetrieval({
    sessionId,
    userId,
    taskKey,
    queryText: query,
    docs: vectorDocs,
    latencyMs: Date.now() - t0,
  });
  return {
    vectorDocs,
    vectorSection: formatVectorSection(vectorDocs),
    sqlSnapshot,
    scores: vectorDocs.map((d) => d.score || 0),
  };
}

module.exports = { retrieveContext, buildSqlSnapshot, MAX_VECTOR_DOCS };
