'use strict';

/**
 * agent/tools.js — Split-library tools as LangChain StructuredTools (Zod).
 *
 * Same 19 operations as features/ai/ai-tools.js TOOL_DEFS, wrapped so the
 * LangGraph ReAct agent can call them natively (model.bindTools) instead of
 * the legacy ```tool regex envelope. Execution still delegates to the audited
 * ai-tools.executeTool() (ownership checks, resolvers) — zero logic fork.
 *
 * Destructive tools (deleteSplit/deleteSession/removeExercise) NEVER execute
 * here: they return { needsConfirm, label } and runner creates the pending
 * token (existing POST /actions/confirm flow, same UX/API contract).
 *
 * buildSplitTools() returns [] when langchain isn't installed yet (code-first
 * phase) — runner degrades to the legacy envelope loop automatically.
 */

const { z } = require('zod');
const aiTools = require('../ai-tools');

const DESTRUCTIVE = new Set(['deleteSplit', 'deleteSession', 'removeExercise']);

function describePendingTool(tool, args = {}) {
  const a = args || {};
  if (tool === 'deleteSplit') return `Delete split "${a.split}" and all its days`;
  if (tool === 'deleteSession') return `Delete day "${a.session}" from "${a.split}"`;
  if (tool === 'removeExercise') return `Remove "${a.exercise}" from "${a.session}"`;
  return `${tool} ${JSON.stringify(a).slice(0, 120)}`;
}

// Zod schemas per tool (required fields mirror TOOL_DEFS).
const SCHEMAS = {
  listSplits: z.object({}),
  getSplit: z.object({ split: z.string().describe('Split id or name') }),
  createSplit: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
  renameSplit: z.object({
    split: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
  }),
  deleteSplit: z.object({ split: z.string() }),
  addSession: z.object({
    split: z.string(),
    name: z.string(),
    sort_order: z.number().optional(),
  }),
  renameSession: z.object({ split: z.string(), session: z.string(), name: z.string() }),
  deleteSession: z.object({ split: z.string(), session: z.string() }),
  duplicateSession: z.object({ split: z.string(), session: z.string(), name: z.string().optional() }),
  searchExercises: z.object({ query: z.string(), limit: z.number().optional() }),
  addExercise: z.object({
    split: z.string(),
    session: z.string(),
    exercise: z.string().describe('Library exercise name or id'),
    sets: z.number().optional(),
    reps: z.string().optional(),
    rest_time: z.string().optional(),
    weight: z.string().optional(),
  }),
  removeExercise: z.object({ split: z.string(), session: z.string(), exercise: z.string() }),
  updateExercise: z.object({
    split: z.string(),
    session: z.string(),
    exercise: z.string(),
    sets: z.number().optional(),
    reps: z.string().optional(),
    rest_time: z.string().optional(),
    weight: z.string().optional(),
  }),
  moveExercise: z.object({
    split: z.string(),
    exercise: z.string(),
    to_session: z.string(),
    from_session: z.string().optional(),
  }),
  swapExercise: z.object({
    split: z.string(),
    session: z.string(),
    exercise: z.string(),
    with: z.string().describe('Replacement library exercise name'),
  }),
  reorderExercises: z.object({
    split: z.string(),
    session: z.string(),
    ordered_ids: z.array(z.number()),
  }),
  reorderSessions: z.object({ split: z.string(), ordered_ids: z.array(z.number()) }),
  generateSplit: z.object({
    days_per_week: z.number().min(1).max(7),
    split_style: z.string().optional(),
    session_duration: z.string().optional(),
    custom_notes: z.string().optional(),
    name: z.string().optional(),
  }),
};

const DESCRIPTIONS = {
  listSplits: 'List my workout splits (id, name, day count).',
  getSplit: 'Full split detail: days + exercises with sets/reps.',
  createSplit: 'Create a new empty workout split.',
  renameSplit: 'Rename or re-describe a split.',
  deleteSplit: 'DESTRUCTIVE: delete a split and all its days. Always confirm first.',
  addSession: 'Add a training day to a split.',
  renameSession: 'Rename a training day.',
  deleteSession: 'DESTRUCTIVE: delete a training day and its exercises. Always confirm first.',
  duplicateSession: 'Copy a training day with all exercises.',
  searchExercises: 'Search the exercise library by name/muscle.',
  addExercise: 'Add a library exercise to a training day.',
  removeExercise: 'DESTRUCTIVE: remove an exercise from a day. Always confirm first.',
  updateExercise: 'Change sets/reps/rest/weight of a day exercise.',
  moveExercise: 'Move an exercise to another day in the same split.',
  swapExercise: 'Replace an exercise with another (keeps sets/reps).',
  reorderExercises: 'Reorder exercises within a day.',
  reorderSessions: 'Reorder days within a split.',
  generateSplit: 'Generate AND save a full multi-day split (days_per_week 1-7).',
};

/**
 * buildSplitTools(userId, sessionId) -> StructuredTool[]
 * Each tool func returns a STRING summary (ReAct convention); runner parses
 * the { needsConfirm } marker for destructive ops.
 */
function buildSplitTools(userId, sessionId) {
  let DynamicStructuredTool = null;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    ({ DynamicStructuredTool } = require('langchain/tools'));
  } catch (_) {
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      ({ DynamicStructuredTool } = require('@langchain/core/tools'));
    } catch (_) {
      return [];
    }
  }
  if (!DynamicStructuredTool) return [];

  return Object.keys(SCHEMAS).map(
    (name) =>
      new DynamicStructuredTool({
        name,
        description: DESCRIPTIONS[name] || name,
        schema: SCHEMAS[name],
        func: async (args) => {
          if (DESTRUCTIVE.has(name)) {
            const label = describePendingTool(name, args);
            return JSON.stringify({ needsConfirm: true, tool: name, args, label });
          }
          const outcome = await aiTools.executeTool(userId, sessionId, name, args || {});
          return outcome.summary || 'Done.';
        },
      })
  );
}

/** toolSpecText() — compact spec for prompts when native binding unavailable. */
function toolSpecText() {
  try {
    return aiTools.toolPromptSpec();
  } catch (_) {
    return Object.keys(SCHEMAS).join(', ');
  }
}

module.exports = { buildSplitTools, toolSpecText, SCHEMAS, DESTRUCTIVE, describePendingTool };
