'use strict';

/**
 * agent/runner.js — Single orchestrator for ALL AI tasks (LangGraph-first, legacy fallback).
 *
 * runChat(userId, { message, session_id, split_id, taskKey, imageUrl })
 *   -> { session_id, session_title, reply, actions }
 * Same contract as legacy ai.service.sendChatMessage (frontend untouched).
 *
 * Flow (V2):
 *   1. ensure session + persist user message (+ confirm-words fast path)
 *   2. retrieveContext() [pgvector + SQL snapshot] + memory summary/window
 *   3. getChatModel(taskKey) + buildSplitTools() + buildGraph()
 *   4. graph.invoke({ messages }) -> final prose + pendingConfirms
 *   5. persist assistant reply, touch session, maybeSummarize, return
 *
 * ANY step failing (packages not installed / migration pending / model error)
 * falls back to legacy sendChatMessageLegacy — zero downtime by design.
 * Enable V2 with AI_AGENT_V2=true (default false until packages+migration done).
 */

const { pool } = require('../../../db');
const aiTools = require('../ai-tools');
const { retrieveContext } = require('../rag/retriever');
const { getSummary, getWindow, maybeSummarize } = require('./memory');
const { getChatModel, getCascadeModels, invokeModel, resolveFallbackId, isUnknownModelError } = require('./modelFactory');
const { buildSplitTools, describePendingTool } = require('./tools');
const { buildSystemPrompt, composeUserTurn } = require('./prompts');
const { buildGraph } = require('./graph');

const CONFIRM_WORDS = /^(yes|yeah|yep|yup|confirm|confirm it|do it|proceed|go ahead|delete it|remove it|ok do it)\.?$/i;
const TASK_KEYS = new Set([
  'coach_chat',
  'workout_coach_chat',
  'meal_analysis',
  'physique_analysis',
  'workout_split_generate',
  'workout_split_refine',
  'workout_report',
  'diet_plan_generate',
]);

/**
 * isV2Enabled() — V2 is always on. The flag was removed: every internal
 * failure (missing packages/tables, dead models, provider outages) already
 * degrades to the legacy loop via legacyFallback(). Kept as a function so
 * callers/tests keep a single switch to read.
 */
function isV2Enabled() {
  return true;
}

function cleanReply(text) {
  try {
    // eslint-disable-next-line global-require
    const legacy = require('../ai.service');
    if (legacy && typeof legacy.sanitizeCleanText === 'function') {
      return legacy.sanitizeCleanText(text);
    }
  } catch (_) {}
  return String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

async function ensureSession(userId, message, sessionId) {
  let active = sessionId || null;
  if (active) {
    const chk = await pool.query('SELECT id, title FROM ai_sessions WHERE id = $1 AND user_id = $2', [active, userId]);
    if (!chk.rows.length) active = null;
  }
  if (!active) {
    const snippet = String(message || '').trim().slice(0, 45) + (String(message || '').trim().length > 45 ? '…' : '');
    const ins = await pool.query('INSERT INTO ai_sessions (user_id, title) VALUES ($1,$2) RETURNING id, title', [
      userId,
      snippet || 'New Chat',
    ]);
    active = ins.rows[0].id;
  }
  await pool.query('INSERT INTO ai_messages (session_id, role, content) VALUES ($1,$2,$3)', [
    active,
    'user',
    String(message).trim(),
  ]);
  return active;
}

async function finishSession(active, reply) {
  await pool.query('INSERT INTO ai_messages (session_id, role, content) VALUES ($1,$2,$3)', [active, 'assistant', reply]);
  const s = await pool.query('UPDATE ai_sessions SET updated_at = NOW() WHERE id = $1 RETURNING id, title', [active]);
  return s.rows[0]?.title || 'Chat';
}

/** Confirm-words fast path (mirrors legacy): 1 pending -> execute, N -> ask. */
async function tryConfirmFastPath(userId, active, message) {
  if (!CONFIRM_WORDS.test(String(message || '').trim())) return null;
  const pendings = await aiTools.listPending(active, userId);
  if (pendings.length === 1) {
    const p = pendings[0];
    // Lazy to avoid load cycle (ai.service requires runner at top).
    // eslint-disable-next-line global-require
    const legacy = require('../ai.service');
    return legacy.runConfirmedTool(userId, active, p.token, true);
  }
  if (pendings.length > 1) {
    const reply = cleanReply(
      `Which change should I apply? ${pendings.map((p) => `"${p.label}"`).join(' / ')} — tap Confirm on the right one, or tell me by name.`
    );
    const title = await finishSession(active, reply);
    return {
      session_id: active,
      session_title: title,
      reply,
      actions: pendings.map((p) => ({ kind: 'pending', label: p.label, confirmToken: p.token, tool: p.tool_name })),
    };
  }
  return null;
}

function invokeGraph(graph, SystemMessage, HumanMessage, system, userTurn) {
  return graph.invoke({
    messages: [new SystemMessage(system), new HumanMessage(userTurn)],
    rounds: 0,
    pendingConfirms: [],
    final: '',
  });
}

async function runGraphPath({ userId, active, taskKey, message, splitId, ctx, summary, windowRows, model, meta, make, tools }) {
  let SystemMessage = null;
  let HumanMessage = null;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    ({ SystemMessage, HumanMessage } = require('@langchain/core/messages'));
  } catch (e) {
    throw new Error(`messages module missing: ${e.message}`);
  }
  const { toolSpecText } = require('./tools');
  const system = buildSystemPrompt(taskKey, { toolSpec: tools.length ? '' : toolSpecText() });
  const windowText = (windowRows || [])
    .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${String(m.content).slice(0, 800)}`)
    .join('\n');
  const userTurn = composeUserTurn({
    query: String(message).trim(),
    vectorSection: ctx.vectorSection,
    sqlSnapshot: ctx.sqlSnapshot,
    summary,
    windowText,
  });
  const graph = buildGraph({ model, tools });
  if (!graph) throw new Error('graph unavailable');

  async function attemptWith(mdl, mt, mk) {
    const gg = mdl === model ? graph : buildGraph({ model: mdl, tools });
    if (!gg) throw new Error('graph unavailable');
    const o = await invokeGraph(gg, SystemMessage, HumanMessage, system, userTurn);
    return { out: o, liveModel: mdl, liveMeta: mt, liveMake: mk };
  }

  // Attempts: 1) primary as-is, 2) same-provider live id, 3+) cascade providers.
  // Any throw here is a provider failure (tool errors arrive as ToolMessages).
  let result = null;
  let lastErr = null;
  try {
    result = await attemptWith(model, meta, make);
  } catch (e) {
    lastErr = e;
    if (make && isUnknownModelError(e)) {
      try {
        const fb = await resolveFallbackId(meta);
        if (fb && fb !== meta.modelId) {
          console.warn(`[agent/runner] ${meta.modelId} rejected — graph retry on ${fb}`);
          result = await attemptWith(make(fb), { ...meta, modelId: fb }, make);
          lastErr = null;
        }
      } catch (e2) {
        lastErr = e2;
      }
    }
    if (!result) {
      const cascade = await getCascadeModels(taskKey, meta.provider);
      for (const c of cascade) {
        try {
          console.warn(`[agent/runner] cascading to ${c.meta.provider}/${c.meta.modelId}`);
          result = await attemptWith(c.model, c.meta, c.make);
          lastErr = null;
          break;
        } catch (e3) {
          lastErr = e3;
        }
      }
    }
    if (!result) throw lastErr;
  }
  const { out, liveModel, liveMeta, liveMake } = result;

  const actions = [];
  for (const pc of out.pendingConfirms || []) {
    const label = pc.label || describePendingTool(pc.tool, pc.args);
    const token = await aiTools.createPending(active, userId, pc.tool, pc.args || {}, label);
    await aiTools.logTool(active, userId, pc.tool, pc.args || {}, 'pending', label);
    actions.push({ kind: 'pending', label, confirmToken: token, tool: pc.tool });
  }
  // Audit successful tool calls already logged inside tools? Log marker row.
  if ((out.messages || []).length) {
    await aiTools.logTool(active, userId, 'agent_graph', { task: taskKey }, 'ok', `rounds complete, ${actions.length} pending`).catch(() => {});
  }

  let final = out.final || '';
  if (!final.trim()) {
    // Graph exhausted without prose: one clean summarizing call.
    final = await invokeModel(
      liveModel,
      liveMeta,
      [
        new SystemMessage(system),
        ...out.messages.slice(-6),
        new HumanMessage('Give the final coaching answer in prose now (no tool calls), summarizing what was done.'),
      ],
      { userId, make: liveMake }
    );
  }
  if (actions.length && !/confirm/i.test(final)) {
    final += '\n\nTap Confirm on the pending change above, or reply yes to apply it.';
  }
  void splitId;
  return { final, actions };
}

async function legacyFallback(userId, args, reason) {
  console.warn(`[agent/runner] legacy fallback (${reason})`);
  // eslint-disable-next-line global-require
  const legacy = require('../ai.service');
  return legacy.sendChatMessageLegacy(userId, args);
}

async function runChat(userId, { message, session_id = null, split_id = null, taskKey = 'coach_chat', imageUrl = null } = {}) {
  const task = TASK_KEYS.has(taskKey) ? taskKey : 'coach_chat';
  if (!message || !String(message).trim()) {
    const err = new Error('Message cannot be empty.');
    err.status = 400;
    throw err;
  }
  const active = await ensureSession(userId, message, session_id);

  const fast = await tryConfirmFastPath(userId, active, message);
  if (fast) return fast;

  try {
    const [ctx, summary, windowRows, modelRes] = await Promise.all([
      retrieveContext({ userId, sessionId: active, taskKey: task, query: message }),
      getSummary(active),
      getWindow(active),
      getChatModel(task),
    ]);
    if (!modelRes || !modelRes.model) throw new Error('chat model unavailable');
    const { model, meta, make } = modelRes;
    const tools = task === 'coach_chat' || task === 'workout_coach_chat' ? buildSplitTools(userId, active) : [];
    void imageUrl;

    const { final, actions } = await runGraphPath({
      userId,
      active,
      taskKey: task,
      message,
      splitId: split_id,
      ctx,
      summary,
      windowRows,
      model,
      meta,
      make,
      tools,
    });
    const reply = cleanReply(final) || "I'm reviewing your stats — keep up the consistency.";
    const title = await finishSession(active, reply);
    maybeSummarize(active, userId, task).catch(() => {});
    return { session_id: active, session_title: title, reply, actions };
  } catch (e) {
    return legacyFallback(userId, { message, session_id: active, split_id }, e.message);
  }
}

/**
 * runChatStream() — SSE-friendly: emits graph token stream when available,
 * else resolves full reply at once. onToken(chunk:string) per token.
 */
async function runChatStream(userId, args, onToken) {
  try {
    const task = TASK_KEYS.has(args.taskKey) ? args.taskKey : 'coach_chat';
    const active = await ensureSession(userId, args.message, args.session_id);
    const [ctx, summary, windowRows, modelRes] = await Promise.all([
      retrieveContext({ userId, sessionId: active, taskKey: task, query: args.message }),
      getSummary(active),
      getWindow(active),
      getChatModel(task),
    ]);
    if (!modelRes || !modelRes.model) throw new Error('chat model unavailable');
    const { toolSpecText } = require('./tools');
    const system = buildSystemPrompt(task, { toolSpec: toolSpecText() });
    const userTurn = composeUserTurn({
      query: String(args.message).trim(),
      vectorSection: ctx.vectorSection,
      sqlSnapshot: ctx.sqlSnapshot,
      summary,
      windowText: (windowRows || []).map((m) => `${m.role}: ${String(m.content).slice(0, 800)}`).join('\n'),
    });
    let SystemMessage = null;
    let HumanMessage = null;
    // eslint-disable-next-line global-require
    ({ SystemMessage, HumanMessage } = require('@langchain/core/messages'));
    const tryStream = (mdl) => mdl.stream([new SystemMessage(system), new HumanMessage(userTurn)]);
    let stream;
    try {
      stream = await tryStream(modelRes.model);
    } catch (e) {
      if (!modelRes.make || !isUnknownModelError(e)) throw e;
      const fb = await resolveFallbackId(modelRes.meta);
      if (!fb || fb === modelRes.meta.modelId) throw e;
      console.warn(`[agent/runner] stream model rejected — retry on ${fb}`);
      stream = await tryStream(modelRes.make(fb));
    }
    let full = '';
    for await (const chunk of stream) {
      const t = typeof chunk.content === 'string' ? chunk.content : '';
      full += t;
      if (onToken && t) onToken(t);
    }
    const reply = cleanReply(full);
    const title = await finishSession(active, reply);
    return { session_id: active, session_title: title, reply, actions: [] };
  } catch (e) {
    const out = await legacyFallback(userId, args, `stream failed: ${e.message}`);
    if (onToken) onToken(out.reply);
    return out;
  }
}

module.exports = { runChat, runChatStream, isV2Enabled, TASK_KEYS };
