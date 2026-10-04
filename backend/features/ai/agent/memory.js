'use strict';

/**
 * agent/memory.js — LangGraph-style memory over ai_conversation_summaries.
 *
 * - getSummary(sessionId): rolling summary text ('' when none).
 * - maybeSummarize(sessionId, userId, taskKey): every SUMMARIZE_EVERY user
 *   turns, compress older messages via legacy callAI into ≤15 lines, store it.
 *   History queries then read: [summary] + last N raw messages (window).
 * - All best-effort: failures only warn, chat never blocks on memory.
 */

const { pool } = require('../../../db');

const SUMMARIZE_EVERY = 20;
const SUMMARY_KEEP_TURNS = 10;

async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_conversation_summaries (
        session_id UUID PRIMARY KEY REFERENCES ai_sessions(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        summary TEXT NOT NULL DEFAULT '',
        message_count INT DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (_) {}
}

async function getSummary(sessionId) {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      'SELECT summary FROM ai_conversation_summaries WHERE session_id = $1',
      [sessionId]
    );
    return rows[0]?.summary || '';
  } catch (_) {
    return '';
  }
}

/** Recent raw window for the prompt (role/content, oldest first). */
async function getWindow(sessionId, limit = SUMMARY_KEEP_TURNS) {
  try {
    const { rows } = await pool.query(
      `SELECT role, content FROM ai_messages
       WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [sessionId, limit]
    );
    return rows.reverse();
  } catch (_) {
    return [];
  }
}

async function maybeSummarize(sessionId, userId, taskKey = 'coach_chat') {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM ai_messages WHERE session_id = $1',
      [sessionId]
    );
    const n = rows[0]?.n || 0;
    const prev = await pool.query(
      'SELECT message_count FROM ai_conversation_summaries WHERE session_id = $1',
      [sessionId]
    );
    const lastCount = prev.rows[0]?.message_count || 0;
    if (n - lastCount < SUMMARIZE_EVERY) return;

    const { rows: older } = await pool.query(
      `SELECT role, content FROM ai_messages
       WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [sessionId, Math.max(n - SUMMARY_KEEP_TURNS, 0)]
    );
    if (!older.length) return;
    const transcript = older
      .slice(-40)
      .map((m) => `${m.role}: ${String(m.content).slice(0, 600)}`)
      .join('\n');

    // Lazy require to avoid load cycles (utils/ai never requires agent/).
    // eslint-disable-next-line global-require
    const { callAI } = require('../../../../utils/ai');
    const summary = await callAI(
      `Summarize this fitness coaching chat into <=15 dense lines for future context. ` +
        `Keep: user goal, level, injuries, active split names, recent lifts/weights, ` +
        `nutrition targets, pending decisions. No markdown symbols.\n\n${transcript}`,
      null,
      taskKey
    );
    await pool.query(
      `INSERT INTO ai_conversation_summaries (session_id, user_id, summary, message_count, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (session_id) DO UPDATE SET
         summary = EXCLUDED.summary, message_count = EXCLUDED.message_count, updated_at = NOW()`,
      [sessionId, userId, String(summary || '').slice(0, 4000), n]
    );
  } catch (e) {
    console.warn(`[agent/memory] summarize skipped: ${e.message}`);
  }
}

module.exports = { getSummary, getWindow, maybeSummarize, SUMMARIZE_EVERY };
