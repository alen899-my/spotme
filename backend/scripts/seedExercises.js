/**
 * seedExercises.js
 * Run from backend/: node scripts/seedExercises.js
 *
 * What it does:
 *  1. Reads exercises.json from the gymapi dataset
 *  2. For each exercise uploads image (.jpg) + gif (.gif) to Cloudflare R2
 *     under exercises/images/ and exercises/videos/
 *  3. Inserts the record into the Neon `exercises` table (idempotent)
 */

const path = require('path');
const fs   = require('fs');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ─── Paths ───────────────────────────────────────────────────────────────────
const GYMAPI_ROOT   = path.join(__dirname, '../../../gymapi/exercises-dataset');
const EXERCISES_JSON = path.join(GYMAPI_ROOT, 'data/exercises.json');
const IMAGES_DIR    = path.join(GYMAPI_ROOT, 'images');
const VIDEOS_DIR    = path.join(GYMAPI_ROOT, 'videos');

// ─── AWS/R2 Client ───────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
  },
});

const BUCKET     = process.env.CLOUDFLARE_R2_BUCKET;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

// ─── DB Pool ─────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Check if a key already exists in R2 to avoid re-uploading */
async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Upload a local file to R2; returns the public URL */
async function uploadToR2(localPath, r2Key, contentType) {
  if (await existsInR2(r2Key)) {
    return `${PUBLIC_URL}/${r2Key}`;
  }
  const body = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         r2Key,
    Body:        body,
    ContentType: contentType,
  }));
  return `${PUBLIC_URL}/${r2Key}`;
}

/** Run a batch of async tasks with limited concurrency */
async function pLimit(tasks, concurrency = 5) {
  const results = [];
  let index = 0;
  async function runNext() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, runNext);
  await Promise.all(workers);
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📖 Reading exercises.json …');
  const exercises = JSON.parse(fs.readFileSync(EXERCISES_JSON, 'utf8'));
  console.log(`✅ Loaded ${exercises.length} exercises`);

  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;

  const tasks = exercises.map((ex) => async () => {
    try {
      // ── 1. Derive file names from the relative paths in JSON ──────────────
      const imgFilename = ex.image   ? path.basename(ex.image)   : null;
      const gifFilename = ex.gif_url ? path.basename(ex.gif_url) : null;

      const imgLocalPath = imgFilename ? path.join(IMAGES_DIR, imgFilename) : null;
      const gifLocalPath = gifFilename ? path.join(VIDEOS_DIR, gifFilename) : null;

      const imgR2Key = imgFilename ? `exercises/images/${imgFilename}` : null;
      const gifR2Key = gifFilename ? `exercises/videos/${gifFilename}` : null;

      // ── 2. Upload image ───────────────────────────────────────────────────
      let imageUrl = null;
      if (imgLocalPath && fs.existsSync(imgLocalPath) && imgR2Key) {
        imageUrl = await uploadToR2(imgLocalPath, imgR2Key, 'image/jpeg');
      }

      // ── 3. Upload gif ─────────────────────────────────────────────────────
      let gifUrl = null;
      if (gifLocalPath && fs.existsSync(gifLocalPath) && gifR2Key) {
        gifUrl = await uploadToR2(gifLocalPath, gifR2Key, 'image/gif');
      }

      // ── 4. Insert into DB ─────────────────────────────────────────────────
      const stepsEn = Array.isArray(ex.instruction_steps?.en) ? ex.instruction_steps.en : [];
      const stepsTr = Array.isArray(ex.instruction_steps?.tr) ? ex.instruction_steps.tr : [];
      const secMuscles = Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles : [];

      await pool.query(
        `INSERT INTO exercises
          (id, name, category, body_part, equipment,
           instructions_en, instructions_tr,
           instruction_steps_en, instruction_steps_tr,
           muscle_group, secondary_muscles, target,
           image_url, gif_url, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [
          ex.id,
          ex.name,
          ex.category   || null,
          ex.body_part  || null,
          ex.equipment  || null,
          ex.instructions?.en || null,
          ex.instructions?.tr || null,
          stepsEn,
          stepsTr,
          ex.muscle_group || null,
          secMuscles,
          ex.target || null,
          imageUrl,
          gifUrl,
          ex.created_at ? new Date(ex.created_at) : new Date(),
        ]
      );

      inserted++;
      if (inserted % 100 === 0) {
        process.stdout.write(`\r   Processed ${inserted}/${exercises.length} …`);
      }
    } catch (err) {
      console.error(`\n❌ Error on exercise ${ex.id} (${ex.name}):`, err.message);
      errors++;
    }
  });

  console.log('🚀 Starting upload + seed (concurrency = 5) …');
  await pLimit(tasks, 5);

  console.log(`\n\n✅ Done!`);
  console.log(`   Inserted : ${inserted}`);
  console.log(`   Skipped  : ${skipped}`);
  console.log(`   Errors   : ${errors}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
