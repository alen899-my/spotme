'use strict';

/**
 * Seed current landing (`/`) images to Cloudflare R2 + site_images DB rows.
 *
 * Usage:
 *   node scripts/seedSiteImages.js           # only seeds slots with no r2_url yet
 *   node scripts/seedSiteImages.js --force    # re-uploads + overwrites all 16 slots
 *
 * Reads from ../admin/public/images/... so the exact files currently served
 * locally become the initial R2 objects (optimized to webp <=1920px via sharp).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3 } = require('../utils/upload');
const { pool } = require('../db');
const { SITE_IMAGE_DEFS, ensureTable } = require('../features/site-images/site-images.service');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'admin', 'public');
const FORCE = process.argv.includes('--force');

function localPathFor(fallback) {
  return path.join(PUBLIC_DIR, fallback.replace(/^\//, ''));
}

async function uploadFile(slug, fallback) {
  const src = localPathFor(fallback);
  if (!fs.existsSync(src)) {
    console.warn(`[skip] ${slug}: missing local file ${src}`);
    return null;
  }
  const buf = await sharp(src)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const key = `spotme/site-images/seed-${slug}.webp`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET,
    Key: key,
    Body: buf,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return { key, url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`, bytes: buf.length };
}

async function main() {
  if (!process.env.CLOUDFLARE_R2_BUCKET || !process.env.CLOUDFLARE_R2_PUBLIC_URL) {
    throw new Error('Missing CLOUDFLARE_R2_BUCKET / CLOUDFLARE_R2_PUBLIC_URL env vars');
  }
  await ensureTable();

  const { rows } = await pool.query(`SELECT slug, r2_url FROM site_images`);
  const existing = new Map(rows.map((r) => [r.slug, r.r2_url]));

  let uploaded = 0;
  let skipped = 0;
  for (const def of SITE_IMAGE_DEFS) {
    if (existing.get(def.slug) && !FORCE) {
      skipped += 1;
      console.log(`[keep] ${def.slug} already seeded`);
      continue;
    }
    const result = await uploadFile(def.slug, def.local_fallback);
    if (!result) continue;
    await pool.query(
      `UPDATE site_images SET r2_key = $1, r2_url = $2, updated_at = CURRENT_TIMESTAMP WHERE slug = $3`,
      [result.key, result.url, def.slug]
    );
    uploaded += 1;
    console.log(`[seed] ${def.slug} -> ${result.url} (${(result.bytes / 1024).toFixed(0)} KB)`);
  }

  console.log(`\nDone. uploaded=${uploaded} kept=${skipped} total=${SITE_IMAGE_DEFS.length}`);
  await pool.end();
}

main().catch((err) => {
  console.error('seedSiteImages failed:', err);
  process.exit(1);
});
