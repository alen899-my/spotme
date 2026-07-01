const express = require('express');
const { pool } = require('../db');
const authenticateAdmin = require('../middleware/adminAuth');
const upload = require('../uploadConfig');
const { s3 } = require('../uploadConfig');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const NeuQuant = require('gif.js/src/NeuQuant');
const omggif = require('omggif');
const multer = require('multer');

const router = express.Router();

const memoryUpload = multer({ storage: multer.memoryStorage() });

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

  // Migrate: add frames column if missing
  try {
    await pool.query(`ALTER TABLE exercise_replacer ADD COLUMN frames JSONB DEFAULT '[]'::jsonb`);
  } catch (_) {}

  // Migrate: add mycopyv1 columns if missing
  for (const col of ['mycopyv1_gif_url', 'mycopyv1_image_url']) {
    try {
      await pool.query(`ALTER TABLE exercise_replacer ADD COLUMN ${col} VARCHAR(500)`);
    } catch (_) {}
  }
}

router.use(authenticateAdmin);
router.use(async (req, res, next) => {
  try { await ensureTables(); } catch (_) {}
  next();
});

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

// Upload a frame (dynamic index, no longer limited to 3)
router.post('/exercises/:id/upload-frame', memoryUpload.single('frame'), async (req, res) => {
  try {
    const { id } = req.params;
    const reset = req.query.reset === 'true';

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const processed = await sharp(req.file.buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const url = await uploadBufferToR2(processed, `frame_${Date.now()}.webp`, 'image/webp');

    // When reset=true, replace frames array entirely (clears old deleted URLs).
    // Otherwise append to existing frames.
    const framesExpr = reset ? '$2::jsonb' : 'exercise_replacer.frames || $2::jsonb';
    await pool.query(`
      INSERT INTO exercise_replacer (exercise_id, frames, status)
      VALUES ($1, $2::jsonb, 'uploading')
      ON CONFLICT (exercise_id)
      DO UPDATE SET
        frames = ${framesExpr},
        status = 'uploading',
        updated_at = CURRENT_TIMESTAMP
    `, [id, JSON.stringify([url])]);

    // Also keep legacy columns for backward compat (first 3 frames)
    const result = await pool.query(
      'SELECT frames FROM exercise_replacer WHERE exercise_id = $1', [id]
    );
    const frames = result.rows[0]?.frames || [];

    // Update legacy frame_1_url, frame_2_url, frame_3_url for first 3 frames
    for (let i = 0; i < Math.min(3, frames.length); i++) {
      const col = `frame_${i + 1}_url`;
      await pool.query(
        `UPDATE exercise_replacer SET ${col} = $1 WHERE exercise_id = $2`,
        [frames[i], id]
      );
    }

    res.json({
      success: true,
      url,
      frameIndex: frames.length - 1,
      totalFrames: frames.length,
    });
  } catch (error) {
    console.error('Upload frame error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a specific frame by index
router.delete('/exercises/:id/frames/:index', async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = parseInt(index);

    const result = await pool.query(
      'SELECT frames FROM exercise_replacer WHERE exercise_id = $1', [id]
    );
    const frames = result.rows[0]?.frames || [];
    if (idx < 0 || idx >= frames.length) {
      return res.status(400).json({ message: 'Invalid frame index' });
    }

    const removedUrl = frames[idx];

    // Remove from R2
    const bucket = process.env.CLOUDFLARE_R2_BUCKET;
    const r2Prefix = process.env.CLOUDFLARE_R2_PUBLIC_URL + '/';
    const key = removedUrl.replace(r2Prefix, '');
    if (key) {
      s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
    }

    // Remove from JSONB array
    frames.splice(idx, 1);
    await pool.query(
      'UPDATE exercise_replacer SET frames = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $2',
      [JSON.stringify(frames), id]
    );

    // Update legacy columns
    for (let i = 0; i < 3; i++) {
      const col = `frame_${i + 1}_url`;
      const val = i < frames.length ? frames[i] : null;
      await pool.query(
        `UPDATE exercise_replacer SET ${col} = $1 WHERE exercise_id = $2`,
        [val, id]
      );
    }

    res.json({ success: true, frames });
  } catch (error) {
    console.error('Delete frame error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reorder frames
router.put('/exercises/:id/frames/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { frameUrls } = req.body;

    if (!Array.isArray(frameUrls)) {
      return res.status(400).json({ message: 'frameUrls must be an array' });
    }

    await pool.query(
      'UPDATE exercise_replacer SET frames = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $2',
      [JSON.stringify(frameUrls), id]
    );

    // Update legacy columns
    for (let i = 0; i < 3; i++) {
      const col = `frame_${i + 1}_url`;
      const val = i < frameUrls.length ? frameUrls[i] : null;
      await pool.query(
        `UPDATE exercise_replacer SET ${col} = $1 WHERE exercise_id = $2`,
        [val, id]
      );
    }

    res.json({ success: true, frames: frameUrls });
  } catch (error) {
    console.error('Reorder frames error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/exercises/:id/upload-reference', upload.single('reference'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const url = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${req.file.key}`;

    await pool.query(`
      INSERT INTO exercise_replacer (exercise_id, reference_image_url)
      VALUES ($1, $2)
      ON CONFLICT (exercise_id)
      DO UPDATE SET reference_image_url = $2, updated_at = CURRENT_TIMESTAMP
    `, [id, url]);

    res.json({ success: true, url });
  } catch (error) {
    console.error('Upload reference error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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

router.post('/exercises/:id/generate-gif', async (req, res) => {
  try {
    const { id } = req.params;
    const { frame_delay, quality, width, height, loop_count } = req.body;

    const result = await pool.query(
      'SELECT frames, frame_1_url FROM exercise_replacer WHERE exercise_id = $1', [id]
    );

    // Read frames from JSONB, fall back to legacy columns for old data
    let frameUrls = result.rows[0]?.frames || [];
    if (!frameUrls.length) {
      frameUrls = [result.rows[0]?.frame_1_url].filter(Boolean);
    }

    if (!frameUrls.length) {
      return res.status(400).json({ message: 'No frames uploaded yet' });
    }

    const gifDelay = Math.round((frame_delay || 200) / 10);
    const gifLoop = loop_count === 0 ? 0 : (loop_count || 0);

    // Read the first frame and detect actual dimensions
    const firstBuf = await getFrameBufferFromUrl(frameUrls[0]);
    const firstMeta = await sharp(firstBuf).metadata();
    const gifWidth = width > 0 ? width : (firstMeta.width || 300);
    const gifHeight = height > 0 ? height : (firstMeta.height || 300);
    const pixelCount = gifWidth * gifHeight * 4; // RGBA

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

    const gifUrl = await uploadBufferToR2(gifBuffer, `${id}.gif`, 'image/gif');
    const thumbnailUrl = frameUrls[0];

    // Save old gif/image to mycopyv1 before overwriting
    const old = await pool.query(
      'SELECT gif_url, image_url FROM exercises WHERE id = $1', [id]
    );
    const oldGif = old.rows[0]?.gif_url || null;
    const oldImg = old.rows[0]?.image_url || null;

    await pool.query(
      'UPDATE exercises SET gif_url = $1, image_url = $2 WHERE id = $3',
      [gifUrl, thumbnailUrl, id]
    );

    await pool.query(`
      UPDATE exercise_replacer SET
        mycopyv1_gif_url = $1, mycopyv1_image_url = $2
      WHERE exercise_id = $3
    `, [oldGif, oldImg, id]);

    await pool.query(
      "UPDATE exercise_replacer SET status = 'replaced', updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $1",
      [id]
    );

    // Delete all frame images from R2 (only need thumbnail + GIF)
    const bucket = process.env.CLOUDFLARE_R2_BUCKET;
    const r2Prefix = process.env.CLOUDFLARE_R2_PUBLIC_URL + '/';
    for (const url of frameUrls) {
      if (url === thumbnailUrl) continue
      const key = url.replace(r2Prefix, '');
      if (key) {
        s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
      }
    }

    // Clear frames column so old URLs don't accumulate (prevents NoSuchKey on retry)
    await pool.query(
      "UPDATE exercise_replacer SET frames = '[]'::jsonb, frame_1_url = NULL, frame_2_url = NULL, frame_3_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $1",
      [id]
    );

    res.json({ success: true, gifUrl, thumbnailUrl });
  } catch (error) {
    console.error('Generate GIF error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/exercises/:id/replace-media', upload.single('gif'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No GIF file uploaded' });

    const gifUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${req.file.key}`;

    const replacer = await pool.query(
      'SELECT frame_1_url FROM exercise_replacer WHERE exercise_id = $1', [id]
    );
    const thumbnailUrl = replacer.rows[0]?.frame_1_url || gifUrl;

    const exercise = await pool.query(
      'UPDATE exercises SET gif_url = $1, image_url = $2 WHERE id = $3 RETURNING *',
      [gifUrl, thumbnailUrl, id]
    );

    await pool.query(
      "UPDATE exercise_replacer SET status = 'replaced', updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $1",
      [id]
    );

    res.json({ success: true, exercise: exercise.rows[0] });
  } catch (error) {
    console.error('Replace media error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/exercises/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM exercise_replacer WHERE exercise_id = $1', [id]
    );
    res.json(result.rows[0] || { exercise_id: id, status: 'pending' });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const ids = req.query.ids ? req.query.ids.split(',') : [];
    if (ids.length === 0) return res.json({});

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
    res.json(statusMap);
  } catch (error) {
    console.error('Get bulk status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/gif-settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gif_settings WHERE id = 1');
    res.json(result.rows[0] || {
      frame_delay: 200, loop_count: 0, quality: 20, width: 300, height: 300,
    });
  } catch (error) {
    console.error('Get GIF settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/gif-settings', async (req, res) => {
  try {
    const { frame_delay, loop_count, quality, width, height } = req.body;
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
    res.json({ success: true, settings: result.rows[0] });
  } catch (error) {
    console.error('Update GIF settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
