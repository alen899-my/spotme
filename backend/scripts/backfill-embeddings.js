'use strict';

/**
 * backfill-embeddings.js — One-shot RAG index builder.
 * Usage: npm run backfill:embeddings [-- exercises=N] [-- user=ID] [-- knowledge]
 * Safe to re-run (upserts are idempotent per source).
 *
 * Requires: packages installed + migration 003 applied.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { ensureStore, countDocuments } = require('../features/ai/rag/vectorstore');
const {
  ingestExerciseLibrary,
  ingestUserReports,
  ingestUserWorkouts,
  ingestKnowledgeSeeds,
} = require('../features/ai/rag/ingest');
const { pool } = require('../db');

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}

async function run() {
  console.log('RAG backfill starting...\n');
  await ensureStore();

  const exercisesLimit = Number(arg('--exercises', '2000'));
  console.log(`1/3 exercises (limit ${exercisesLimit})...`);
  const ex = await ingestExerciseLibrary({ limit: exercisesLimit });
  console.log(`   ${ex.exercises} exercises -> ${ex.chunks} chunks`);

  console.log('2/3 knowledge seeds...');
  const kn = await ingestKnowledgeSeeds();
  console.log(`   ${kn.docs} docs -> ${kn.chunks} chunks`);

  const onlyUser = arg('--user', null);
  const { rows: users } = onlyUser
    ? await pool.query('SELECT id FROM users WHERE id = $1', [Number(onlyUser)])
    : await pool.query(
        `SELECT DISTINCT user_id AS id FROM daily_workouts
         UNION SELECT DISTINCT user_id AS id FROM workout_reports
         UNION SELECT id FROM users LIMIT 200`
      );
  console.log(`3/3 user history (${users.length} users)...`);
  let uChunks = 0;
  for (const u of users) {
    try {
      const r = await ingestUserReports(u.id);
      const w = await ingestUserWorkouts(u.id);
      uChunks += r.chunks + w.chunks;
    } catch (e) {
      console.warn(`   user ${u.id} skipped: ${e.message}`);
    }
  }
  console.log(`   user chunks: ${uChunks}`);

  console.log(`\nTotal ai_documents: ${await countDocuments()}`);
  console.log('Backfill complete.');
  await pool.end();
}

run().catch(async (e) => {
  console.error('Backfill failed:', e.message);
  try {
    await pool.end();
  } catch (_) {}
  process.exit(1);
});
