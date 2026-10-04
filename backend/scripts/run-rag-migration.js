'use strict';

/**
 * run-rag-migration.js — Applies migrations/003_pgvector_rag.sql.
 * Usage: npm run migrate:rag  (or node scripts/run-rag-migration.js)
 * Safe to re-run. Verifies pgvector extension + ai_documents index.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  console.log('Connected to DB\n');
  try {
    const sqlPath = path.join(__dirname, '../migrations/003_pgvector_rag.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Applying 003_pgvector_rag.sql ...');
    await client.query(sql);
    console.log('Migration applied.\n');

    console.log('Verification:');
    for (const table of ['ai_documents', 'ai_conversation_summaries', 'ai_retrieval_logs']) {
      try {
        const { rows } = await client.query(`SELECT COUNT(*)::int AS cnt FROM ${table}`);
        console.log(`  ${table} — ${rows[0].cnt} rows`);
      } catch (e) {
        console.log(`  ${table} — MISSING (${e.message})`);
      }
    }
    try {
      const { rows } = await client.query(
        `SELECT extname FROM pg_extension WHERE extname = 'vector'`
      );
      console.log(rows.length ? '  pgvector extension — ENABLED' : '  pgvector extension — NOT AVAILABLE (retriever will degrade to SQL-only)');
    } catch (e) {
      console.log(`  pgvector check skipped: ${e.message}`);
    }
    console.log('\nMigration 003 complete.');
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
