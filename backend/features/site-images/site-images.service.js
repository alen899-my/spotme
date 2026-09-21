'use strict';

const { pool } = require('../../db');
const { s3 } = require('../../utils/upload');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Stable slot definitions. Slugs never change; local public/ files were removed
// after migrating to R2, so fallbacks point at the seeded R2 objects.
const R2_SEED_BASE = 'https://pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev/spotme/site-images';
const SITE_IMAGE_DEFS = [
  { slug: 'hero-frame-1', section: 'hero', title: 'Hero Frame 1 — Body Status', local_fallback: `${R2_SEED_BASE}/seed-hero-frame-1.webp`, alt: 'SpotMe Body Status & Muscle Highlighter' },
  { slug: 'hero-frame-2', section: 'hero', title: 'Hero Frame 2 — Explore Tools', local_fallback: `${R2_SEED_BASE}/seed-hero-frame-2.webp`, alt: 'SpotMe Explore Tools & Workouts' },
  { slug: 'hero-frame-3', section: 'hero', title: 'Hero Frame 3 — Dashboard', local_fallback: `${R2_SEED_BASE}/seed-hero-frame-3.webp`, alt: 'SpotMe Main Dashboard & Daily Tracking' },
  { slug: 'hero-frame-4', section: 'hero', title: 'Hero Frame 4 — Meals', local_fallback: `${R2_SEED_BASE}/seed-hero-frame-4.webp`, alt: 'SpotMe Meals & Macro Tracking' },
  { slug: 'hero-frame-5', section: 'hero', title: 'Hero Frame 5 — Leaderboard', local_fallback: `${R2_SEED_BASE}/seed-hero-frame-5.webp`, alt: 'SpotMe Community Leaderboard & XP Ranks' },
  { slug: 'bento-exercises', section: 'bento', title: 'Bento — Exercise Library', local_fallback: `${R2_SEED_BASE}/seed-bento-exercises.webp`, alt: 'SpotMe Exercise Library and Muscle Map' },
  { slug: 'bento-splits', section: 'bento', title: 'Bento — Workout Splits', local_fallback: `${R2_SEED_BASE}/seed-bento-splits.webp`, alt: 'SpotMe Workout Splits' },
  { slug: 'bento-workoutlog', section: 'bento', title: 'Bento — Workout Logger', local_fallback: `${R2_SEED_BASE}/seed-bento-workoutlog.webp`, alt: 'SpotMe In-Gym Workout Logger' },
  { slug: 'bento-foodlog', section: 'bento', title: 'Bento — Food Log', local_fallback: `${R2_SEED_BASE}/seed-bento-foodlog.webp`, alt: 'SpotMe Meal and Food Tracker' },
  { slug: 'bento-weight', section: 'bento', title: 'Bento — Weight Progress', local_fallback: `${R2_SEED_BASE}/seed-bento-weight.webp`, alt: 'SpotMe Body Weight Progress Tracker' },
  { slug: 'bento-reports', section: 'bento', title: 'Bento — Weekly Reports', local_fallback: `${R2_SEED_BASE}/seed-bento-reports.webp`, alt: 'SpotMe Training Reports' },
  { slug: 'bento-calendar', section: 'bento', title: 'Bento — Workout Calendar', local_fallback: `${R2_SEED_BASE}/seed-bento-calendar.webp`, alt: 'SpotMe Calendar Heatmap' },
  { slug: 'bento-following', section: 'bento', title: 'Bento — Community', local_fallback: `${R2_SEED_BASE}/seed-bento-following.webp`, alt: 'SpotMe Athlete Following Feed' },
  { slug: 'smart-meal-scan', section: 'smart', title: 'Smart — Meal Scan', local_fallback: `${R2_SEED_BASE}/seed-smart-meal-scan.webp`, alt: 'Analyze what you eat with SpotMe' },
  { slug: 'smart-physique-scan', section: 'smart', title: 'Smart — Physique Scan', local_fallback: `${R2_SEED_BASE}/seed-smart-physique-scan.webp`, alt: 'Track your body progress with SpotMe' },
  { slug: 'team-cheer', section: 'team', title: 'Team — Community Cheer', local_fallback: `${R2_SEED_BASE}/seed-team-cheer.webp`, alt: 'SpotMe Community Team' },
];

const VALID_SLUGS = new Set(SITE_IMAGE_DEFS.map((d) => d.slug));

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_images (
      slug TEXT PRIMARY KEY,
      section TEXT NOT NULL,
      title TEXT NOT NULL,
      local_fallback TEXT NOT NULL,
      r2_key TEXT,
      r2_url TEXT,
      alt TEXT,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_site_images_section ON site_images(section);`);
  // Seed slot rows (idempotent — never overwrites an existing r2_url)
  for (const d of SITE_IMAGE_DEFS) {
    await pool.query(
      `INSERT INTO site_images (slug, section, title, local_fallback, alt)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (slug) DO UPDATE SET
         section = EXCLUDED.section,
         title = EXCLUDED.title,
         local_fallback = EXCLUDED.local_fallback,
         alt = EXCLUDED.alt`,
      [d.slug, d.section, d.title, d.local_fallback, d.alt]
    );
  }
}

function toPublicRow(row) {
  const url = row.r2_url || row.local_fallback;
  return {
    slug: row.slug,
    section: row.section,
    title: row.title,
    url,
    fallback: row.local_fallback,
    isCustom: !!row.r2_url,
    alt: row.alt,
    updated_at: row.updated_at,
  };
}

async function listSiteImages() {
  await ensureTable();
  const { rows } = await pool.query(`SELECT * FROM site_images ORDER BY section, slug`);
  return rows.map(toPublicRow);
}

// Public payload: { map, updated_at }. map[slug] = display URL (R2 or local fallback).
async function getPublicMap() {
  await ensureTable();
  const { rows } = await pool.query(`SELECT slug, r2_url, local_fallback, MAX(updated_at) OVER () AS max_updated FROM site_images`);
  const map = {};
  let updated_at = null;
  for (const r of rows) {
    map[r.slug] = r.r2_url || r.local_fallback;
    updated_at = r.max_updated;
  }
  // Include any def missing from DB (table just created race) with fallback
  for (const d of SITE_IMAGE_DEFS) {
    if (!map[d.slug]) map[d.slug] = d.local_fallback;
  }
  return { map, updated_at };
}

function invalidateCache() {
  // No-op (memory cache removed in favor of fresh direct queries)
}

async function replaceImage(slug, file) {
  if (!VALID_SLUGS.has(slug)) {
    const err = new Error(`Unknown site image slot: ${slug}`);
    err.status = 400;
    throw err;
  }
  if (!file || !file.key) {
    const err = new Error('No file uploaded');
    err.status = 400;
    throw err;
  }
  await ensureTable();
  const prev = await pool.query(`SELECT r2_key FROM site_images WHERE slug = $1`, [slug]);
  const oldKey = prev.rows[0]?.r2_key;
  const r2Url = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${file.key}`;
  await pool.query(
    `UPDATE site_images SET r2_key = $1, r2_url = $2, updated_at = CURRENT_TIMESTAMP WHERE slug = $3`,
    [file.key, r2Url, slug]
  );
  invalidateCache();
  // Best-effort delete of previous object (hard-replace semantics)
  if (oldKey && oldKey !== file.key) {
    s3.send(new DeleteObjectCommand({ Bucket: process.env.CLOUDFLARE_R2_BUCKET, Key: oldKey })).catch(() => {});
  }
  const { rows } = await pool.query(`SELECT * FROM site_images WHERE slug = $1`, [slug]);
  return toPublicRow(rows[0]);
}

// Hard delete: remove R2 object AND revert slot to local fallback.
async function deleteImageHard(slug) {
  if (!VALID_SLUGS.has(slug)) {
    const err = new Error(`Unknown site image slot: ${slug}`);
    err.status = 400;
    throw err;
  }
  await ensureTable();
  const prev = await pool.query(`SELECT r2_key FROM site_images WHERE slug = $1`, [slug]);
  const oldKey = prev.rows[0]?.r2_key;
  if (oldKey) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.CLOUDFLARE_R2_BUCKET, Key: oldKey }));
    } catch (_) {
      // Object may already be gone — still revert DB row
    }
  }
  await pool.query(
    `UPDATE site_images SET r2_key = NULL, r2_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE slug = $1`,
    [slug]
  );
  invalidateCache();
  const { rows } = await pool.query(`SELECT * FROM site_images WHERE slug = $1`, [slug]);
  return toPublicRow(rows[0]);
}

module.exports = {
  SITE_IMAGE_DEFS,
  ensureTable,
  listSiteImages,
  getPublicMap,
  replaceImage,
  deleteImageHard,
};
