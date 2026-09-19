const { pool } = require('../../db');
const { s3 } = require('../../utils/upload');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const NeuQuant = require('gif.js/src/NeuQuant');
const omggif = require('omggif');

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercise_replacer (
      exercise_id VARCHAR(10) PRIMARY KEY REFERENCES exercises(id) ON DELETE CASCADE,
      reference_image_url VARCHAR(500),
      frame_1_url VARCHAR(500),
      frame_2_url VARCHAR(500),
      frame_3_url VARCHAR(500),
      frames JSONB DEFAULT '[]'::jsonb,
      status VARCHAR(20) DEFAULT 'pending',
      mycopyv1_gif_url VARCHAR(500),
      mycopyv1_image_url VARCHAR(500),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gif_settings (
      id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      frame_delay INT DEFAULT 200,
      loop_count INT DEFAULT 0,
      quality INT DEFAULT 20,
      width INT DEFAULT 300,
      height INT DEFAULT 300,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    INSERT INTO gif_settings (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `);

  try {
    await pool.query(`ALTER TABLE exercise_replacer ADD COLUMN frames JSONB DEFAULT '[]'::jsonb`);
  } catch (_) {}

  for (const col of ['mycopyv1_gif_url', 'mycopyv1_image_url']) {
    try {
      await pool.query(`ALTER TABLE exercise_replacer ADD COLUMN ${col} VARCHAR(500)`);
    } catch (_) {}
  }
}

async function uploadBufferToR2(buffer, filename, contentType) {
  const key = `spotme/file-replacer/${Date.now()}_${Math.random().toString(36).substring(7)}_${filename}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

async function getFrameBufferFromUrl(url) {
  const key = url.replace(`${process.env.CLOUDFLARE_R2_PUBLIC_URL}/`, '');
  const response = await s3.send(new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET,
    Key: key,
  }));
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function rgbaToRgb(rgba) {
  const len = Math.floor(rgba.length / 4);
  const rgb = Buffer.alloc(len * 3);
  for (let i = 0; i < len; i++) {
    rgb[i * 3] = rgba[i * 4];
    rgb[i * 3 + 1] = rgba[i * 4 + 1];
    rgb[i * 3 + 2] = rgba[i * 4 + 2];
  }
  return rgb;
}

/**
 * Upload a frame buffer to R2 and add to exercise_replacer frames.
 */
async function uploadFrame(exerciseId, buffer, reset) {
  const processed = await sharp(buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const url = await uploadBufferToR2(processed, `frame_${Date.now()}.webp`, 'image/webp');

  const framesExpr = reset ? '$2::jsonb' : 'exercise_replacer.frames || $2::jsonb';
  await pool.query(`
    INSERT INTO exercise_replacer (exercise_id, frames, status)
    VALUES ($1, $2::jsonb, 'uploading')
    ON CONFLICT (exercise_id)
    DO UPDATE SET
      frames = ${framesExpr},
      status = 'uploading',
      updated_at = CURRENT_TIMESTAMP
  `, [exerciseId, JSON.stringify([url])]);

  const result = await pool.query(
    'SELECT frames FROM exercise_replacer WHERE exercise_id = $1', [exerciseId]
  );
  const frames = result.rows[0]?.frames || [];

  for (let i = 0; i < Math.min(3, frames.length); i++) {
    const col = `frame_${i + 1}_url`;
    await pool.query(
      `UPDATE exercise_replacer SET ${col} = $1 WHERE exercise_id = $2`,
      [frames[i], exerciseId]
    );
  }

  return {
    url,
    frameIndex: frames.length - 1,
    totalFrames: frames.length,
  };
}

/**
 * Delete a specific frame by index.
 */
async function deleteFrame(exerciseId, idx) {
  const result = await pool.query(
    'SELECT frames FROM exercise_replacer WHERE exercise_id = $1', [exerciseId]
  );
  const frames = result.rows[0]?.frames || [];
  if (idx < 0 || idx >= frames.length) return null;

  const removedUrl = frames[idx];
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  const r2Prefix = process.env.CLOUDFLARE_R2_PUBLIC_URL + '/';
  const key = removedUrl.replace(r2Prefix, '');
  if (key) {
    s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
  }

  frames.splice(idx, 1);
  await pool.query(
    'UPDATE exercise_replacer SET frames = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $2',
    [JSON.stringify(frames), exerciseId]
  );

  for (let i = 0; i < 3; i++) {
    const col = `frame_${i + 1}_url`;
    const val = i < frames.length ? frames[i] : null;
    await pool.query(
      `UPDATE exercise_replacer SET ${col} = $1 WHERE exercise_id = $2`,
      [val, exerciseId]
    );
  }

  return frames;
}

/**
 * Reorder frames.
 */
async function reorderFrames(exerciseId, frameUrls) {
  await pool.query(
    'UPDATE exercise_replacer SET frames = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $2',
    [JSON.stringify(frameUrls), exerciseId]
  );

  for (let i = 0; i < 3; i++) {
    const col = `frame_${i + 1}_url`;
    const val = i < frameUrls.length ? frameUrls[i] : null;
    await pool.query(
      `UPDATE exercise_replacer SET ${col} = $1 WHERE exercise_id = $2`,
      [val, exerciseId]
    );
  }
}

/**
 * Upload reference image.
 */
async function uploadReferenceImage(exerciseId, key) {
  const url = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
  await pool.query(`
    INSERT INTO exercise_replacer (exercise_id, reference_image_url)
    VALUES ($1, $2)
    ON CONFLICT (exercise_id)
    DO UPDATE SET reference_image_url = $2, updated_at = CURRENT_TIMESTAMP
  `, [exerciseId, url]);
  return url;
}

/**
 * Generate animated GIF from frames.
 */
async function generateGif(exerciseId, options) {
  const { frame_delay, quality, width, height, loop_count } = options;

  const result = await pool.query(
    'SELECT frames, frame_1_url FROM exercise_replacer WHERE exercise_id = $1', [exerciseId]
  );

  let frameUrls = result.rows[0]?.frames || [];
  if (!frameUrls.length) {
    frameUrls = [result.rows[0]?.frame_1_url].filter(Boolean);
  }

  if (!frameUrls.length) {
    const err = new Error('No frames uploaded yet');
    err.status = 400;
    throw err;
  }

  const gifDelay = Math.round((frame_delay || 200) / 10);
  const gifLoop = loop_count === 0 ? 0 : (loop_count || 0);

  const firstBuf = await getFrameBufferFromUrl(frameUrls[0]);
  const firstMeta = await sharp(firstBuf).metadata();
  const gifWidth = width > 0 ? width : (firstMeta.width || 300);
  const gifHeight = height > 0 ? height : (firstMeta.height || 300);
  const pixelCount = gifWidth * gifHeight * 4;

  const firstRgba = await sharp(firstBuf)
    .resize(gifWidth, gifHeight)
    .ensureAlpha()
    .raw()
    .toBuffer();

  const firstRgb = rgbaToRgb(firstRgba);
  const nq = new NeuQuant(firstRgb, quality || 20);
  nq.buildColormap();

  const nqPalette = nq.getColormap();
  const omggifPalette = [];
  for (let i = 0; i < 256; i++) {
    omggifPalette.push(
      (nqPalette[i * 3] << 16) | (nqPalette[i * 3 + 1] << 8) | nqPalette[i * 3 + 2]
    );
  }

  function indexPixels(rgba) {
    const indexed = new Uint8Array(pixelCount / 4);
    for (let i = 0; i < pixelCount / 4; i++) {
      indexed[i] = nq.lookupRGB(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
    }
    return indexed;
  }

  const estSize = (gifWidth * gifHeight * 2 + 1024) * frameUrls.length;
  const gifBuf = Buffer.alloc(estSize);
  const writer = new omggif.GifWriter(gifBuf, gifWidth, gifHeight, {
    loop: gifLoop,
    palette: omggifPalette,
  });

  writer.addFrame(0, 0, gifWidth, gifHeight, indexPixels(firstRgba), {
    delay: gifDelay,
  });

  for (let i = 1; i < frameUrls.length; i++) {
    const buf = await getFrameBufferFromUrl(frameUrls[i]);
    const rgba = await sharp(buf)
      .resize(gifWidth, gifHeight)
      .ensureAlpha()
      .raw()
      .toBuffer();

    writer.addFrame(0, 0, gifWidth, gifHeight, indexPixels(rgba), {
      delay: gifDelay,
    });
  }

  const finalSize = writer.end();
  const gifBuffer = gifBuf.slice(0, finalSize);

  const gifUrl = await uploadBufferToR2(gifBuffer, `${exerciseId}.gif`, 'image/gif');
  const thumbnailUrl = frameUrls[0];

  const old = await pool.query(
    'SELECT gif_url, image_url FROM exercises WHERE id = $1', [exerciseId]
  );
  const oldGif = old.rows[0]?.gif_url || null;
  const oldImg = old.rows[0]?.image_url || null;

  await pool.query(
    'UPDATE exercises SET gif_url = $1, image_url = $2 WHERE id = $3',
    [gifUrl, thumbnailUrl, exerciseId]
  );

  await pool.query(`
    UPDATE exercise_replacer SET
      mycopyv1_gif_url = $1, mycopyv1_image_url = $2
    WHERE exercise_id = $3
  `, [oldGif, oldImg, exerciseId]);

  await pool.query(
    "UPDATE exercise_replacer SET status = 'replaced', updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $1",
    [exerciseId]
  );

  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  const r2Prefix = process.env.CLOUDFLARE_R2_PUBLIC_URL + '/';
  for (const url of frameUrls) {
    if (url === thumbnailUrl) continue;
    const key = url.replace(r2Prefix, '');
    if (key) {
      s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
    }
  }

  await pool.query(
    "UPDATE exercise_replacer SET frames = '[]'::jsonb, frame_1_url = NULL, frame_2_url = NULL, frame_3_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $1",
    [exerciseId]
  );

  return { gifUrl, thumbnailUrl };
}

/**
 * Replace media with uploaded GIF file.
 */
async function replaceMedia(exerciseId, fileKey) {
  const gifUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileKey}`;
  const replacer = await pool.query(
    'SELECT frame_1_url FROM exercise_replacer WHERE exercise_id = $1', [exerciseId]
  );
  const thumbnailUrl = replacer.rows[0]?.frame_1_url || gifUrl;

  const exercise = await pool.query(
    'UPDATE exercises SET gif_url = $1, image_url = $2 WHERE id = $3 RETURNING *',
    [gifUrl, thumbnailUrl, exerciseId]
  );

  await pool.query(
    "UPDATE exercise_replacer SET status = 'replaced', updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $1",
    [exerciseId]
  );

  return exercise.rows[0];
}

/**
 * Get status of exercise replacer for an exercise.
 */
async function getReplacerStatus(exerciseId) {
  const result = await pool.query(
    'SELECT * FROM exercise_replacer WHERE exercise_id = $1', [exerciseId]
  );
  return result.rows[0] || { exercise_id: exerciseId, status: 'pending' };
}

/**
 * Get bulk status for multiple exercise IDs.
 */
async function getBulkReplacerStatus(ids) {
  if (ids.length === 0) return {};

  const result = await pool.query(
    `SELECT exercise_id, status, frames, frame_1_url, frame_2_url, frame_3_url,
            reference_image_url, mycopyv1_gif_url, mycopyv1_image_url, updated_at
     FROM exercise_replacer
     WHERE exercise_id = ANY($1::varchar[])`,
    [ids]
  );

  const statusMap = {};
  for (const row of result.rows) {
    statusMap[row.exercise_id] = row;
  }
  return statusMap;
}

/**
 * Get GIF settings.
 */
async function getGifSettings() {
  const result = await pool.query('SELECT * FROM gif_settings WHERE id = 1');
  return result.rows[0] || {
    frame_delay: 200, loop_count: 0, quality: 20, width: 300, height: 300,
  };
}

/**
 * Update GIF settings.
 */
async function updateGifSettings(data) {
  const { frame_delay, loop_count, quality, width, height } = data;
  await pool.query(`
    UPDATE gif_settings SET
      frame_delay = COALESCE($1, frame_delay),
      loop_count = COALESCE($2, loop_count),
      quality = COALESCE($3, quality),
      width = COALESCE($4, width),
      height = COALESCE($5, height),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [frame_delay, loop_count, quality, width, height]);

  const result = await pool.query('SELECT * FROM gif_settings WHERE id = 1');
  return result.rows[0];
}

module.exports = {
  ensureTables,
  uploadBufferToR2,
  getFrameBufferFromUrl,
  rgbaToRgb,
  uploadFrame,
  deleteFrame,
  reorderFrames,
  uploadReferenceImage,
  generateGif,
  replaceMedia,
  getReplacerStatus,
  getBulkReplacerStatus,
  getGifSettings,
  updateGifSettings,
};
