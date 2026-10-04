-- =============================================================================
-- Migration 003: pgvector RAG store + LangGraph memory
-- Industry-standard RAG pipeline backing for all 8 AI tasks.
-- Run via: npm run migrate:rag  (or node scripts/run-rag-migration.js)
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- Requires: Neon / Postgres 15+ with pgvector extension available.
-- Embedding dim: 768 (Gemini text-embedding-004 / local-hash fallback).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 1. RAG document chunks (exercises, reports, meals, workouts, knowledge) ──
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
CREATE INDEX IF NOT EXISTS idx_ai_documents_source
  ON ai_documents (source_type, source_id);
-- HNSW cosine index for fast top-k retrieval (Neon pgvector >= 0.5)
-- Falls back gracefully if HNSW unsupported: plain scan still works.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_documents_embedding'
  ) THEN
    CREATE INDEX idx_ai_documents_embedding
      ON ai_documents USING hnsw (embedding vector_cosine_ops);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'HNSW index skipped (pgvector version): %', SQLERRM;
END $$;

-- ── 2. Conversation summaries (LangGraph memory rollup, 1 per session) ───────
CREATE TABLE IF NOT EXISTS ai_conversation_summaries (
  session_id UUID PRIMARY KEY REFERENCES ai_sessions(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  message_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. RAG retrieval logs (eval / tracing: what was retrieved per turn) ──────
CREATE TABLE IF NOT EXISTS ai_retrieval_logs (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  task_key VARCHAR(100) NOT NULL DEFAULT 'coach_chat',
  query_text TEXT,
  retrieved_ids UUID[],
  scores NUMERIC[],
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_retrieval_session
  ON ai_retrieval_logs (session_id, created_at DESC);

-- ── 4. LangSmith trace linkage on existing usage logs (nullable, no break) ───
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS trace_id TEXT;
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS retrieved_doc_count INT DEFAULT 0;

-- ── 5. Ensure base chat tables exist (idempotent, mirrors ai_chat_tables.sql) ─
CREATE TABLE IF NOT EXISTS ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_sessions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id, created_at ASC);

-- Allow tool role on legacy DBs created with CHECK (role IN user/assistant) only.
DO $$
BEGIN
  ALTER TABLE ai_messages DROP CONSTRAINT IF EXISTS ai_messages_role_check;
  ALTER TABLE ai_messages ADD CONSTRAINT ai_messages_role_check
    CHECK (role IN ('user', 'assistant', 'system', 'tool'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'role check migration skipped: %', SQLERRM;
END $$;
