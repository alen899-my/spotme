'use strict';

/**
 * rag/embeddings.js — Embedding provider factory (LangChain-compatible).
 *
 * Industry-standard RAG needs text -> vector(768). Provider order:
 *   1. Gemini text-embedding-004 (768 dims, key already in .env / ai_providers)
 *   2. Deterministic local-hash fallback (no network, 768 dims, L2-normalized)
 *      so retrieval + ingest NEVER hard-fail before keys/packages exist.
 *
 * Exposes LangChain-style interface: { embedQuery, embedDocuments, dim }.
 * Lazy-requires @langchain/google-genai so the server boots pre-install.
 */

const EMBEDDING_DIM = 768;
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

/**
 * Deterministic hash embedding (fallback only — NOT semantically meaningful,
 * but stable + normalized so pgvector cosine still runs and code paths verify).
 */
function hashEmbed(text) {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const s = String(text || '');
  // Bigram-hashed pseudo-semantics: same words -> same buckets.
  const tokens = s.toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean);
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const bucket = Math.abs(h) % EMBEDDING_DIM;
    vec[bucket] += 1 + tok.length / 10;
  }
  // Length feature in last bucket so empty != non-empty.
  vec[EMBEDDING_DIM - 1] += s.length / 500;
  const norm = Math.sqrt(vec.reduce((a, v) => a + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function isValidVector(v) {
  return (
    Array.isArray(v) &&
    v.length === EMBEDDING_DIM &&
    v.every((n) => Number.isFinite(Number(n)))
  );
}

function getGeminiApiKey() {
  return (process.env.GEMINI_API_KEY || '').trim() || null;
}

let _provider = null;
// Once the remote embedder fails, stop retrying it for the rest of the
// process (e.g. invalid key during bulk backfill) — straight to hash.
let _remoteDead = false;

function markRemoteDead(reason) {
  if (!_remoteDead) {
    _remoteDead = true;
    console.warn(`[rag/embeddings] remote embedder disabled for process (${reason}) — hash fallback.`);
  }
}

/**
 * getEmbeddingProvider()
 * Returns { name, dim, embedQuery(text)->number[], embedDocuments(text[])->number[][] }
 */
function getEmbeddingProvider() {
  if (_provider) return _provider;

  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
      const model = new GoogleGenerativeAIEmbeddings({
        apiKey,
        model: GEMINI_EMBED_MODEL,
      });
      _provider = {
        name: `gemini:${GEMINI_EMBED_MODEL}`,
        dim: EMBEDDING_DIM,
        embedQuery: async (t) => {
          if (!_remoteDead) {
            try {
              const v = await model.embedQuery(String(t || ''));
              if (isValidVector(v)) return v;
              markRemoteDead('malformed response');
            } catch (e) {
              markRemoteDead(e.message);
            }
            _provider.name = `gemini:${GEMINI_EMBED_MODEL}+hash-fallback`;
          }
          return hashEmbed(t);
        },
        embedDocuments: async (arr) => {
          if (!_remoteDead) {
            try {
              const vecs = await model.embedDocuments((arr || []).map((x) => String(x || '')));
              if (Array.isArray(vecs) && vecs.length === (arr || []).length && vecs.every(isValidVector)) {
                return vecs;
              }
              markRemoteDead('malformed batch');
            } catch (e) {
              markRemoteDead(e.message);
            }
            _provider.name = `gemini:${GEMINI_EMBED_MODEL}+hash-fallback`;
          }
          return (arr || []).map(hashEmbed);
        },
      };
      return _provider;
    } catch (e) {
      console.warn(`[rag/embeddings] Gemini embeddings unavailable (${e.message}) — using hash fallback.`);
    }
  }

  _provider = {
    name: 'local-hash-fallback',
    dim: EMBEDDING_DIM,
    embedQuery: async (t) => hashEmbed(t),
    embedDocuments: async (arr) => (arr || []).map(hashEmbed),
  };
  return _provider;
}

/**
 * chunkText() — Recursive-ish character splitter (no langchain dep required).
 * Keeps chunks ~chunkSize with overlap, splits on paragraph > sentence > space.
 */
function chunkText(text, { chunkSize = 800, overlap = 120 } = {}) {
  const s = String(text || '').trim();
  if (!s) return [];
  if (s.length <= chunkSize) return [s];
  const chunks = [];
  let start = 0;
  while (start < s.length) {
    let end = Math.min(start + chunkSize, s.length);
    if (end < s.length) {
      const soft = Math.max(
        s.lastIndexOf('\n\n', end),
        s.lastIndexOf('. ', end),
        s.lastIndexOf('\n', end),
        s.lastIndexOf(' ', end)
      );
      if (soft > start + chunkSize * 0.4) end = soft + 1;
    }
    chunks.push(s.slice(start, end).trim());
    if (end >= s.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

module.exports = { EMBEDDING_DIM, getEmbeddingProvider, chunkText, hashEmbed };
