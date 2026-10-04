'use strict';

/**
 * rag/vectorstore.js — pgvector store over ai_documents (raw pg, no ORM).
 *
 * - upsertDocuments([{ user_id, source_type, source_id, chunk_index, content, metadata, embedding }])
 * - similaritySearch({ queryEmbedding, userId, sourceTypes, k })
 *   cosine distance `<=>`, scoped: user docs + global docs (user_id IS NULL).
 * - Graceful degrade: if pgvector/extension missing -> [] (callers fall back to SQL snapshot).
 *
 * Requires migration 003_pgvector_rag.sql. ensureStore() best-effort creates
 * extension + table so dev boots even pre-migration (migration is canonical).
 */

const { pool } = require('../../../db');

function toVectorLiteral(vec) {
  if (!Array.isArray(vec)) throw new Error('Embedding must be an array.');
  return `[${vec.map((v) => Number(v) || 0).join(',')}]`;
}

let _ensured = false;

async function ensureStore() {
  if (_ensured) return true;
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        source_type VARCHAR(50) NOT NULL,
        source_id TEXT,
        chunk_index INT DEFAULT 0,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        embedding vector(768),
        token_count INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_documents_user_type
        ON ai_documents (user_id, source_type);
    `);
    _ensured = true;
    return true;
  } catch (e) {
    console.warn(`[rag/vectorstore] ensureStore skipped: ${e.message}`);
    return false;
  }
}

/**
 * Delete-then-insert per (source_type, source_id, user scope) for idempotent re-ingest.
 */
async function upsertDocuments(docs) {
  if (!docs || !docs.length) return 0;
  await ensureStore();
  let count = 0;
  // Group by identity for scoped delete.
  const groups = new Map();
  for (const d of docs) {
    const key = `${d.source_type}||${d.source_id}||${d.user_id == null ? 'global' : `u${d.user_id}`}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }
  for (const [, group] of groups) {
    const g0 = group[0];
    // Defense-in-depth: skip malformed embeddings instead of failing the batch.
    const valid = group.filter(
      (d) => Array.isArray(d.embedding) && d.embedding.length > 0
    );
    if (!valid.length) {
      console.warn(`[rag/vectorstore] skipped ${g0.source_type}/${g0.source_id}: no valid embeddings`);
      continue;
    }
    try {
      if (g0.user_id == null) {
        await pool.query(
          `DELETE FROM ai_documents WHERE source_type = $1 AND source_id = $2 AND user_id IS NULL`,
          [g0.source_type, String(g0.source_id)]
        );
      } else {
        await pool.query(
          `DELETE FROM ai_documents WHERE source_type = $1 AND source_id = $2 AND user_id = $3`,
          [g0.source_type, String(g0.source_id), g0.user_id]
        );
      }
      for (const d of valid) {
        await pool.query(
          `INSERT INTO ai_documents
             (user_id, source_type, source_id, chunk_index, content, metadata, embedding, token_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7::vector,$8)`,
          [
            d.user_id == null ? null : d.user_id,
            d.source_type,
            String(d.source_id),
            d.chunk_index || 0,
            d.content,
            JSON.stringify(d.metadata || {}),
            toVectorLiteral(d.embedding),
            d.content ? Math.round(String(d.content).length / 4) : 0,
          ]
        );
        count++;
      }
    } catch (e) {
      console.warn(`[rag/vectorstore] upsert failed for ${g0.source_type}/${g0.source_id}: ${e.message}`);
    }
  }
  return count;
}

async function similaritySearch({ queryEmbedding, userId = null, sourceTypes = null, k = 8 } = {}) {
  try {
    const vecLit = toVectorLiteral(queryEmbedding);
    const params = [vecLit];
    let idx = 2;
    // Scope: global knowledge + this user's docs.
    let scope = '(d.user_id IS NULL';
    if (userId != null) {
      scope += ` OR d.user_id = $${idx++}`;
      params.push(userId);
    }
    scope += ')';
    let typeFilter = '';
    if (Array.isArray(sourceTypes) && sourceTypes.length) {
      typeFilter = `AND d.source_type = ANY($${idx++})`;
      params.push(sourceTypes);
    }
    params.push(Math.min(Math.max(Number(k) || 8, 1), 20));
    const { rows } = await pool.query(
      `SELECT d.id, d.user_id, d.source_type, d.source_id, d.chunk_index,
              d.content, d.metadata,
              (d.embedding <=> $1::vector) AS distance
       FROM ai_documents d
       WHERE d.embedding IS NOT NULL AND ${scope} ${typeFilter}
       ORDER BY d.embedding <=> $1::vector
       LIMIT $${idx}`,
      params
    );
    return rows.map((r) => ({
      id: r.id,
      source_type: r.source_type,
      source_id: r.source_id,
      content: r.content,
      metadata: r.metadata || {},
      // cosine similarity approx from distance (0..2) -> (1..0)
      score: Math.max(0, 1 - Number(r.distance || 0)),
    }));
  } catch (e) {
    console.warn(`[rag/vectorstore] similaritySearch degraded: ${e.message}`);
    return [];
  }
}

async function countDocuments() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM ai_documents');
    return rows[0].cnt;
  } catch (_) {
    return -1;
  }
}

module.exports = {
  ensureStore,
  upsertDocuments,
  similaritySearch,
  countDocuments,
  toVectorLiteral,
};
