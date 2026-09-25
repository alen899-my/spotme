'use strict';

/**
 * ai-tools.js — Tool registry + executor for the Coach Spotty tool-calling loop.
 *
 * Standard provider-agnostic approach (works on OpenRouter/Gemini/Groq without
 * per-provider function-calling APIs): the LLM emits a JSON tool envelope,
 * this module validates args, enforces ownership, executes via the existing
 * workouts.service functions, and returns concise summaries for the next loop.
 *
 * Destructive tools (delete split/session, remove exercise) never execute
 * directly — use createPending() + confirm flow instead.
 */

const crypto = require('crypto');
const { pool } = require('../../db');
const workouts = require('../workouts/workouts.service');

let _ensured = false;

/**
 * ensureTables()
 * Self-healing DDL so no manual migration step is required.
 */
async function ensureTables() {
  if (_ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_tool_calls (
      id SERIAL PRIMARY KEY,
      session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      tool_name VARCHAR(100) NOT NULL,
      args JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(20) DEFAULT 'ok',
      summary TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_tool_calls_session ON ai_tool_calls(session_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS ai_pending_actions (
      token VARCHAR(64) PRIMARY KEY,
      session_id UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tool_name VARCHAR(100) NOT NULL,
      args JSONB DEFAULT '{}'::jsonb,
      label TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 minutes'
    );
    CREATE INDEX IF NOT EXISTS idx_ai_pending_session ON ai_pending_actions(session_id, expires_at ASC);
  `);
  _ensured = true;
}

async function logTool(sessionId, userId, toolName, args, status, summary) {
  try {
    await ensureTables();
    await pool.query(
      `INSERT INTO ai_tool_calls (session_id, user_id, tool_name, args, status, summary)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, userId, toolName, JSON.stringify(args || {}), status, summary || null]
    );
  } catch (e) {
    console.warn('[ai-tools] audit log failed:', e.message);
  }
}

// ─── resolvers (name → id, scoped to owner) ────────────────────────────────────

async function resolveSplit(userId, ref) {
  if (ref == null || ref === '') return null;
  if (/^\d+$/.test(String(ref))) {
    const r = await pool.query('SELECT * FROM workout_splits WHERE id = $1 AND user_id = $2', [Number(ref), userId]);
    return r.rows[0] || null;
  }
  const r = await pool.query(
    `SELECT * FROM workout_splits WHERE user_id = $1 AND name ILIKE $2 ORDER BY created_at DESC LIMIT 1`,
    [userId, `%${String(ref).trim()}%`]
  );
  return r.rows[0] || null;
}

async function listSplitsBrief(userId) {
  const r = await pool.query(
    `SELECT s.id, s.name,
            (SELECT COUNT(*)::int FROM workout_sessions ws WHERE ws.split_id = s.id) AS session_count
     FROM workout_splits s WHERE s.user_id = $1 ORDER BY s.created_at DESC LIMIT 20`,
    [userId]
  );
  return r.rows;
}

async function resolveSession(userId, splitId, ref) {
  if (ref == null || ref === '') return null;
  if (/^\d+$/.test(String(ref))) {
    const r = await pool.query(
      `SELECT ws.* FROM workout_sessions ws JOIN workout_splits s ON s.id = ws.split_id
       WHERE ws.id = $1 AND ws.split_id = $2 AND s.user_id = $3`,
      [Number(ref), splitId, userId]
    );
    return r.rows[0] || null;
  }
  const r = await pool.query(
    `SELECT ws.* FROM workout_sessions ws JOIN workout_splits s ON s.id = ws.split_id
     WHERE ws.split_id = $1 AND s.user_id = $2 AND ws.name ILIKE $3
     ORDER BY ws.sort_order ASC LIMIT 1`,
    [splitId, userId, `%${String(ref).trim()}%`]
  );
  return r.rows[0] || null;
}

async function resolveSessionExercise(userId, sessionId, ref) {
  if (/^\d+$/.test(String(ref))) {
    const r = await pool.query(
      `SELECT wse.*, e.name AS exercise_name FROM workout_session_exercises wse
       JOIN exercises e ON e.id = wse.exercise_id
       WHERE wse.id = $1 AND wse.session_id = $2
         AND wse.session_id IN (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON s.id = ws.split_id WHERE s.user_id = $3)`,
      [Number(ref), sessionId, userId]
    );
    return r.rows[0] || null;
  }
  const r = await pool.query(
    `SELECT wse.*, e.name AS exercise_name FROM workout_session_exercises wse
     JOIN exercises e ON e.id = wse.exercise_id
     WHERE wse.session_id = $1 AND e.name ILIKE $2
       AND wse.session_id IN (SELECT ws.id FROM workout_sessions ws JOIN workout_splits s ON s.id = ws.split_id WHERE s.user_id = $3)
     ORDER BY wse.sort_order ASC LIMIT 1`,
    [sessionId, `%${String(ref).trim()}%`, userId]
  );
  return r.rows[0] || null;
}

async function resolveLibraryExercise(query) {
  const rows = await workouts.searchExercises({ q: query, limit: 5 });
  return rows[0] || null;
}

// ─── tool definitions ─────────────────────────────────────────────────────────
// arg spec: { required?: string[], optional?: string[] } — validated generically.

const TOOL_DEFS = {
  listSplits:            { destructive: false, desc: 'List my workout splits (id, name, session count).' },
  getSplit:              { destructive: false, desc: 'Full split detail: sessions + exercises.', required: ['split'] },
  createSplit:           { destructive: false, desc: 'Create a new empty split.', required: ['name'], optional: ['description'] },
  renameSplit:           { destructive: false, desc: 'Rename / re-describe a split.', required: ['split'], optional: ['name', 'description'] },
  deleteSplit:           { destructive: true,  desc: 'Delete a split and everything in it.', required: ['split'] },
  addSession:            { destructive: false, desc: 'Add a training day to a split.', required: ['split', 'name'], optional: ['sort_order'] },
  renameSession:         { destructive: false, desc: 'Rename a session/day.', required: ['split', 'session', 'name'] },
  deleteSession:         { destructive: true,  desc: 'Delete a session and its exercises.', required: ['split', 'session'] },
  duplicateSession:      { destructive: false, desc: 'Copy a session with all exercises.', required: ['split', 'session'], optional: ['name'] },
  searchExercises:       { destructive: false, desc: 'Search the exercise library.', required: ['query'], optional: ['limit'] },
  addExercise:           { destructive: false, desc: 'Add an exercise to a session.', required: ['split', 'session', 'exercise'], optional: ['sets', 'reps', 'rest_time', 'weight', 'sort_order'] },
  removeExercise:        { destructive: true,  desc: 'Remove an exercise from a session.', required: ['split', 'session', 'exercise'] },
  updateExercise:        { destructive: false, desc: 'Change sets/reps/rest/weight of a session exercise.', required: ['split', 'session', 'exercise'], optional: ['sets', 'reps', 'rest_time', 'weight'] },
  moveExercise:          { destructive: false, desc: 'Move an exercise to another session (same split), optionally at a position.', required: ['split', 'exercise', 'to_session'], optional: ['from_session', 'sort_order'] },
  swapExercise:          { destructive: false, desc: 'Replace an exercise with another from the library (keeps sets/reps).', required: ['split', 'session', 'exercise', 'with'] },
  reorderExercises:      { destructive: false, desc: 'Reorder exercises in a session.', required: ['split', 'session', 'ordered_ids'] },
  reorderSessions:       { destructive: false, desc: 'Reorder sessions/days in a split.', required: ['split', 'ordered_ids'] },
  generateSplit:         { destructive: false, desc: 'AI-generate AND save a full split (days, style, minutes, notes).', required: ['days_per_week'], optional: ['split_style', 'session_duration', 'custom_notes', 'name'] },
};

function toolPromptSpec() {
  const lines = Object.entries(TOOL_DEFS).map(([name, d]) => {
    const args = [...(d.required || []).map(a => `${a}*`), ...(d.optional || [])].join(', ');
    return `- ${name}(${args})${d.destructive ? ' [DESTRUCTIVE: needs user confirm]' : ''} — ${d.desc}`;
  });
  return lines.join('\n');
}

// ─── pending actions ──────────────────────────────────────────────────────────

async function createPending(sessionId, userId, toolName, args, label) {
  await ensureTables();
  const token = crypto.randomBytes(16).toString('hex');
  await pool.query(
    `INSERT INTO ai_pending_actions (token, session_id, user_id, tool_name, args, label)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [token, sessionId, userId, toolName, JSON.stringify(args || {}), label]
  );
  return token;
}

async function listPending(sessionId, userId) {
  await ensureTables();
  const r = await pool.query(
    `SELECT token, tool_name, args, label, created_at FROM ai_pending_actions
     WHERE session_id = $1 AND user_id = $2 AND expires_at > NOW() ORDER BY created_at ASC`,
    [sessionId, userId]
  );
  return r.rows;
}

async function consumePending(token, userId) {
  await ensureTables();
  const r = await pool.query(
    `SELECT * FROM ai_pending_actions WHERE token = $1 AND user_id = $2 AND expires_at > NOW()`,
    [token, userId]
  );
  if (!r.rows.length) return null;
  await pool.query('DELETE FROM ai_pending_actions WHERE token = $1', [token]);
  return r.rows[0];
}

// ─── executor ─────────────────────────────────────────────────────────────────
// Returns { summary, data?, action? } where action = {kind:'created'|'deleted'|..., label}
// Throws with .status for user-facing errors.

async function executeTool(userId, sessionId, name, args = {}) {
  await ensureTables();
  const def = TOOL_DEFS[name];
  if (!def) throw Object.assign(new Error(`Unknown tool: ${name}`), { status: 400 });

  const fail = (msg, status = 400) => { throw Object.assign(new Error(msg), { status }); };
  const need = (v, label) => { if (v == null || String(v).trim() === '') fail(`${label} is required.`); };

  switch (name) {
    case 'listSplits': {
      const rows = await listSplitsBrief(userId);
      const summary = rows.length
        ? rows.map(s => `#${s.id} ${s.name} (${s.session_count} days)`).join('; ')
        : 'No splits yet.';
      return { summary, data: rows };
    }

    case 'getSplit': {
      need(args.split, 'split');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const sessions = await workouts.getSessionsForSplit(split.id, userId);
      const full = [];
      for (const s of sessions) {
        const exs = await workouts.getSessionExercises(s.id, userId);
        full.push({ id: s.id, name: s.name, exercises: exs.map(e => ({ wse_id: e.id, name: e.name, sets: e.sets, reps: e.reps, rest_time: e.rest_time, weight: e.weight })) });
      }
      const summary = `${split.name}: ` + (full.length
        ? full.map(s => `${s.name} [${s.exercises.map(e => e.name).join(', ') || 'empty'}]`).join(' | ')
        : 'no sessions');
      return { summary, data: { split, sessions: full } };
    }

    case 'createSplit': {
      need(args.name, 'name');
      const row = await workouts.createSplit(userId, { name: String(args.name).trim(), description: args.description || '' });
      return { summary: `Created split "${row.name}" (#${row.id}).`, data: row, action: { kind: 'created', label: `Split "${row.name}" created` } };
    }

    case 'renameSplit': {
      need(args.split, 'split');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const row = await workouts.updateSplit(split.id, userId, { name: args.name, description: args.description });
      return { summary: `Split renamed to "${row.name}".`, data: row, action: { kind: 'updated', label: `Split renamed to "${row.name}"` } };
    }

    case 'deleteSplit':
    case 'deleteSession':
    case 'removeExercise': {
      // Destructive tools only run with an explicit confirmation flag
      // (set by the confirm endpoint / yes-handler, never by the LLM).
      if (!args._confirmed) return { needsConfirm: true };
      if (name === 'deleteSplit') {
        need(args.split, 'split');
        const workoutsSvc = require('../workouts/workouts.service');
        const split = await resolveSplit(userId, args.split);
        if (!split) fail(`Split "${args.split}" not found.`);
        await workoutsSvc.deleteSplit(split.id, userId);
        return { summary: `Deleted split "${split.name}".`, data: { deleted: true }, action: { kind: 'deleted', label: `Split "${split.name}" deleted` } };
      }
      if (name === 'deleteSession') {
        need(args.split, 'split'); need(args.session, 'session');
        const workoutsSvc = require('../workouts/workouts.service');
        const split = await resolveSplit(userId, args.split);
        if (!split) fail(`Split "${args.split}" not found.`);
        const sess = await resolveSession(userId, split.id, args.session);
        if (!sess) fail(`Session "${args.session}" not found.`);
        await workoutsSvc.deleteSession(sess.id, userId);
        return { summary: `Deleted day "${sess.name}" from ${split.name}.`, data: { deleted: true }, action: { kind: 'deleted', label: `Day "${sess.name}" deleted` } };
      }
      need(args.split, 'split'); need(args.session, 'session'); need(args.exercise, 'exercise');
      const workoutsSvc = require('../workouts/workouts.service');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const sess = await resolveSession(userId, split.id, args.session);
      if (!sess) fail(`Session "${args.session}" not found.`);
      const wse = await resolveSessionExercise(userId, sess.id, args.exercise);
      if (!wse) fail(`"${args.exercise}" is not in ${sess.name}.`);
      await workoutsSvc.deleteExerciseFromSession(wse.id, userId);
      return { summary: `Removed ${wse.exercise_name} from ${sess.name}.`, data: { deleted: true }, action: { kind: 'deleted', label: `${wse.exercise_name} removed` } };
    }

    case 'addSession': {
      need(args.split, 'split'); need(args.name, 'name');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const row = await workouts.createSession(split.id, userId, { name: String(args.name).trim(), sort_order: args.sort_order });
      return { summary: `Added day "${row.name}" to ${split.name}.`, data: row, action: { kind: 'created', label: `Day "${row.name}" added` } };
    }

    case 'renameSession': {
      need(args.split, 'split'); need(args.session, 'session'); need(args.name, 'name');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const sess = await resolveSession(userId, split.id, args.session);
      if (!sess) fail(`Session "${args.session}" not found in ${split.name}.`);
      const row = await workouts.updateSession(sess.id, userId, { name: String(args.name).trim() });
      return { summary: `Day renamed to "${row.name}".`, data: row, action: { kind: 'updated', label: `Day renamed to "${row.name}"` } };
    }

    case 'duplicateSession': {
      need(args.split, 'split'); need(args.session, 'session');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const sess = await resolveSession(userId, split.id, args.session);
      if (!sess) fail(`Session "${args.session}" not found in ${split.name}.`);
      const row = await workouts.duplicateSession(sess.id, userId, { name: args.name });
      return { summary: `Duplicated "${sess.name}" as "${row.name}".`, data: row, action: { kind: 'created', label: `Day "${row.name}" duplicated` } };
    }

    case 'searchExercises': {
      need(args.query, 'query');
      const rows = await workouts.searchExercises({ q: args.query, limit: Math.min(Number(args.limit) || 5, 10) });
      const summary = rows.length ? rows.map(e => `${e.name} (${e.target})`).join('; ') : `No matches for "${args.query}".`;
      return { summary, data: rows };
    }

    case 'addExercise': {
      need(args.split, 'split'); need(args.session, 'session'); need(args.exercise, 'exercise');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const sess = await resolveSession(userId, split.id, args.session);
      if (!sess) fail(`Session "${args.session}" not found in ${split.name}.`);
      let lib = null;
      if (/^[A-Za-z0-9-]{1,10}$/.test(String(args.exercise).trim()) && !String(args.exercise).includes(' ')) {
        const chk = await pool.query('SELECT * FROM exercises WHERE id = $1', [String(args.exercise).trim()]);
        lib = chk.rows[0] || null;
      }
      if (!lib) {
        lib = await resolveLibraryExercise(args.exercise);
        if (!lib) fail(`Exercise "${args.exercise}" not found in library.`);
      }
      const row = await workouts.addExerciseToSession(sess.id, userId, {
        exercise_id: lib.id,
        sets: args.sets, reps: args.reps, rest_time: args.rest_time, sort_order: args.sort_order,
      });
      if (args.weight !== undefined) {
        await workouts.updateExerciseInSession(row.id, userId, { weight: String(args.weight) });
      }
      return { summary: `Added ${lib.name} to ${sess.name} (${row.sets}x${row.reps}).`, data: { ...row, name: lib.name }, action: { kind: 'created', label: `${lib.name} added to ${sess.name}` } };
    }

    case 'updateExercise': {
      need(args.split, 'split'); need(args.session, 'session'); need(args.exercise, 'exercise');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const sess = await resolveSession(userId, split.id, args.session);
      if (!sess) fail(`Session "${args.session}" not found.`);
      const wse = await resolveSessionExercise(userId, sess.id, args.exercise);
      if (!wse) fail(`"${args.exercise}" is not in ${sess.name}.`);
      const row = await workouts.updateExerciseInSession(wse.id, userId, {
        sets: args.sets, reps: args.reps, rest_time: args.rest_time, weight: args.weight,
      });
      return { summary: `Updated ${wse.exercise_name} (${row.sets}x${row.reps}, rest ${row.rest_time}).`, data: row, action: { kind: 'updated', label: `${wse.exercise_name} updated` } };
    }

    case 'moveExercise': {
      need(args.split, 'split'); need(args.exercise, 'exercise'); need(args.to_session, 'to_session');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const dest = await resolveSession(userId, split.id, args.to_session);
      if (!dest) fail(`Destination "${args.to_session}" not found in ${split.name}.`);
      let wseId = null; let wseName = '';
      if (args.from_session) {
        const src = await resolveSession(userId, split.id, args.from_session);
        if (!src) fail(`Session "${args.from_session}" not found.`);
        const wse = await resolveSessionExercise(userId, src.id, args.exercise);
        if (!wse) fail(`"${args.exercise}" is not in ${src.name}.`);
        wseId = wse.id; wseName = wse.exercise_name;
      } else {
        // Find across all sessions of the split.
        const sessions = await workouts.getSessionsForSplit(split.id, userId);
        for (const s of sessions) {
          const wse = await resolveSessionExercise(userId, s.id, args.exercise);
          if (wse) { wseId = wse.id; wseName = wse.exercise_name; break; }
        }
        if (!wseId) fail(`"${args.exercise}" not found in ${split.name}.`);
      }
      const row = await workouts.moveExerciseToSession(wseId, userId, { to_session_id: dest.id, sort_order: args.sort_order });
      return { summary: `Moved ${wseName} to ${dest.name}.`, data: row, action: { kind: 'moved', label: `${wseName} moved to ${dest.name}` } };
    }

    case 'swapExercise': {
      need(args.split, 'split'); need(args.session, 'session'); need(args.exercise, 'exercise'); need(args.with, 'replacement');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const sess = await resolveSession(userId, split.id, args.session);
      if (!sess) fail(`Session "${args.session}" not found.`);
      const wse = await resolveSessionExercise(userId, sess.id, args.exercise);
      if (!wse) fail(`"${args.exercise}" is not in ${sess.name}.`);
      const lib = await resolveLibraryExercise(args.with);
      if (!lib) fail(`Replacement "${args.with}" not found in library.`);
      const row = await workouts.updateExerciseInSession(wse.id, userId, { exercise_id: lib.id });
      return { summary: `Swapped ${wse.exercise_name} for ${lib.name} in ${sess.name}.`, data: row, action: { kind: 'updated', label: `${wse.exercise_name} swapped for ${lib.name}` } };
    }

    case 'reorderExercises': {
      need(args.split, 'split'); need(args.session, 'session');
      if (!Array.isArray(args.ordered_ids) || !args.ordered_ids.length) fail('ordered_ids must be a non-empty array of exercise ids.');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      const sess = await resolveSession(userId, split.id, args.session);
      if (!sess) fail(`Session "${args.session}" not found.`);
      await workouts.updateSplitLayout(split.id, userId, {
        sessions: [{ id: sess.id, exercises: args.ordered_ids.map((id, i) => ({ id: Number(id), sort_order: i })) }],
      });
      return { summary: `Reordered ${args.ordered_ids.length} exercises in ${sess.name}.`, data: { ok: true }, action: { kind: 'updated', label: `${sess.name} reordered` } };
    }

    case 'reorderSessions': {
      need(args.split, 'split');
      if (!Array.isArray(args.ordered_ids) || !args.ordered_ids.length) fail('ordered_ids must be a non-empty array of session ids.');
      const split = await resolveSplit(userId, args.split);
      if (!split) fail(`Split "${args.split}" not found.`);
      await workouts.updateSplitLayout(split.id, userId, {
        sessions: args.ordered_ids.map((id, i) => ({ id: Number(id), sort_order: i })),
      });
      return { summary: `Reordered ${args.ordered_ids.length} days in ${split.name}.`, data: { ok: true }, action: { kind: 'updated', label: `${split.name} days reordered` } };
    }

    case 'generateSplit': {
      const days = Number(args.days_per_week);
      if (!Number.isInteger(days) || days < 1 || days > 7) fail('days_per_week must be 1-7.');
      const draft = await workouts.generateAiSplit(userId, {
        days_per_week: days,
        split_style: args.split_style,
        session_duration: args.session_duration,
        custom_notes: args.custom_notes,
      });
      const saved = await workouts.saveAiSplit(userId, {
        name: args.name || draft.name,
        description: draft.description,
        template_goal: draft.template_goal,
        template_level: draft.template_level,
        template_days: draft.template_days,
        sessions: draft.sessions.map(s => ({
          name: s.name,
          exercises: (s.exercises || []).map(e => ({
            exercise_id: e.exercise_id, sets: e.sets, reps: e.reps, rest_time: e.rest_time || e.rest,
          })),
        })),
      });
      return {
        summary: `Built "${saved.name}" (#${saved.id}): ` + draft.sessions.map(s => `${s.name} [${(s.exercises || []).map(e => e.name).join(', ')}]`).join(' | '),
        data: saved,
        action: { kind: 'created', label: `Split "${saved.name}" created (${days} days)` },
      };
    }

    default:
      fail(`Tool "${name}" is not implemented.`);
  }
}

module.exports = {
  TOOL_DEFS,
  toolPromptSpec,
  executeTool,
  createPending,
  listPending,
  consumePending,
  ensureTables,
  logTool,
};
