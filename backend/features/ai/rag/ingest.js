'use strict';

/**
 * rag/ingest.js — Ingestion pipeline: DB rows / knowledge text -> chunks -> ai_documents.
 *
 * Sources:
 *   - 'exercise'      global exercise library (instructions + muscles + equipment)
 *   - 'workout_report' per-user coaching reports (completed)
 *   - 'user_workout'   per-user completed workout summaries
 *   - 'meal_plan'      per-user nutrition targets + plan
 *   - 'knowledge'      global coaching knowledge (seed docs, admin-added)
 *
 * Idempotent: upsertDocuments() deletes prior chunks per (source_type, source_id, scope).
 * Run: node scripts/backfill-embeddings.js
 */

const { pool } = require('../../../db');
const { getEmbeddingProvider, chunkText } = require('./embeddings');
const { upsertDocuments } = require('./vectorstore');

function docText(parts) {
  return parts.filter(Boolean).join('\n').trim();
}

async function embedAndStore({ userId = null, sourceType, sourceId, text, metadata = {}, chunkOpts = {} }) {
  const chunks = chunkText(text, chunkOpts);
  if (!chunks.length) return 0;
  const provider = getEmbeddingProvider();
  const vectors = await provider.embedDocuments(chunks);
  return upsertDocuments(
    chunks.map((content, i) => ({
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      chunk_index: i,
      content,
      metadata: { ...metadata, embedder: provider.name },
      embedding: vectors[i],
    }))
  );
}

/** Global exercise library -> ai_documents (user_id NULL). */
async function ingestExerciseLibrary({ limit = 2000 } = {}) {
  const { rows } = await pool.query(
    `SELECT id, name, category, body_part, equipment, muscle_group, target,
            secondary_muscles, instructions_en, instruction_steps_en
     FROM exercises ORDER BY id ASC LIMIT $1`,
    [limit]
  );
  let total = 0;
  for (const e of rows) {
    const steps = Array.isArray(e.instruction_steps_en) ? e.instruction_steps_en.join(' | ') : '';
    const text = docText([
      `Exercise: ${e.name} (#${e.id})`,
      `Muscles: primary ${e.muscle_group || e.target || 'n/a'}; secondary ${(e.secondary_muscles || []).join(', ') || 'n/a'}`,
      `Body part: ${e.body_part || 'n/a'} | Equipment: ${e.equipment || 'n/a'} | Category: ${e.category || 'n/a'}`,
      `How to: ${e.instructions_en || steps || 'Follow standard form, controlled tempo.'}`,
    ]);
    total += await embedAndStore({
      sourceType: 'exercise',
      sourceId: `exercise:${e.id}`,
      text,
      metadata: { name: e.name, target: e.target, equipment: e.equipment },
    });
  }
  return { exercises: rows.length, chunks: total };
}

/** Per-user completed reports -> ai_documents (scoped to user). */
async function ingestUserReports(userId, { limit = 20 } = {}) {
  const { rows } = await pool.query(
    `SELECT id, summary, good_things, areas_to_improve, recommendations,
            TO_CHAR(created_at, 'YYYY-MM-DD') AS d
     FROM workout_reports WHERE user_id = $1 AND status = 'completed'
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  let total = 0;
  for (const r of rows) {
    const text = docText([
      `Coaching report ${r.d}:`,
      `Summary: ${r.summary || ''}`,
      `Strengths: ${r.good_things || ''}`,
      `Improve: ${r.areas_to_improve || ''}`,
      `Plan: ${r.recommendations || ''}`,
    ]);
    total += await embedAndStore({
      userId,
      sourceType: 'workout_report',
      sourceId: `report:${r.id}`,
      text,
      metadata: { date: r.d },
    });
  }
  return { reports: rows.length, chunks: total };
}

/** Per-user completed workouts -> ai_documents (scoped to user). */
async function ingestUserWorkouts(userId, { limit = 20 } = {}) {
  const { rows } = await pool.query(
    `SELECT id, title, total_volume, total_duration_seconds, calories_burned,
            TO_CHAR(completed_at, 'YYYY-MM-DD HH24:MI') AS t, notes
     FROM daily_workouts WHERE user_id = $1 AND status = 'completed'
     ORDER BY completed_at DESC LIMIT $2`,
    [userId, limit]
  );
  let total = 0;
  for (const w of rows) {
    const exRes = await pool.query(
      `SELECT e.name, dwe.best_set_weight, dwe.best_set_reps
       FROM daily_workout_exercises dwe JOIN exercises e ON e.id = dwe.exercise_id
       WHERE dwe.daily_workout_id = $1 AND dwe.is_skipped = false
       ORDER BY dwe.sort_order ASC LIMIT 12`,
      [w.id]
    );
    const exs = exRes.rows.map((e) => `${e.name} best ${e.best_set_weight || 0}kg x ${e.best_set_reps || 0}`).join('; ');
    const text = docText([
      `Workout [${w.t}] "${w.title}": volume ${Math.round(w.total_volume || 0)}kg, ${Math.round((w.total_duration_seconds || 0) / 60)}min, ${w.calories_burned || 0}kcal.`,
      `Lifts: ${exs || 'none'}. Notes: ${w.notes || '-'}`,
    ]);
    total += await embedAndStore({
      userId,
      sourceType: 'user_workout',
      sourceId: `workout:${w.id}`,
      text,
      metadata: { title: w.title },
    });
  }
  return { workouts: rows.length, chunks: total };
}

/** Global coaching knowledge seeds (progressive overload, protein, deload...). */
const KNOWLEDGE_SEEDS = [
  {
    id: 'progressive-overload',
    title: 'Progressive overload fundamentals',
    text: 'Progressive overload: add 1-2 reps or 2.5-5% load when top sets hit RPE 7-8 with clean form. Track estimated 1RM per lift. Deload every 4-8 weeks (40-60% volume). Stall rule: if a lift stalls 3 sessions, swap variation or add back-off volume.',
  },
  {
    id: 'protein-guide',
    title: 'Protein and hypertrophy nutrition',
    text: 'Hypertrophy protein target 1.6-2.2g per kg bodyweight daily across 3-5 meals (25-50g each). Sleep 7-9h. Surplus +5-10% for growth, deficit -10-20% for fat loss with protein at top of range to retain muscle.',
  },
  {
    id: 'beginner-safety',
    title: 'Beginner form and safety',
    text: 'Beginners: master hip hinge, squat, press, row, carry patterns first. Warm up 5-10 min. Rest 60-90s isolation, 2-4min compounds. Stop on sharp pain. Never sacrifice spinal position for load.',
  },
  {
    id: 'hydration-recovery',
    title: 'Hydration and recovery',
    text: 'Hydration baseline 30-40ml per kg daily plus 500-1000ml per hard training hour. Recovery: 48h before re-hitting same muscle hard, 1 rest day weekly minimum, deload on persistent fatigue + performance drop.',
  },
];

async function ingestKnowledgeSeeds() {
  let total = 0;
  for (const k of KNOWLEDGE_SEEDS) {
    total += await embedAndStore({
      sourceType: 'knowledge',
      sourceId: `knowledge:${k.id}`,
      text: `${k.title}\n${k.text}`,
      metadata: { title: k.title },
    });
  }
  return { docs: KNOWLEDGE_SEEDS.length, chunks: total };
}

module.exports = {
  ingestExerciseLibrary,
  ingestUserReports,
  ingestUserWorkouts,
  ingestKnowledgeSeeds,
  embedAndStore,
};
