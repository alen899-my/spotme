const express = require('express');
const { pool } = require('../db');
const authenticateAdmin = require('../middleware/adminAuth');
const upload = require('../uploadConfig');
const { s3 } = require('../uploadConfig');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
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
      status VARCHAR(20) DEFAULT 'pending',
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

router.post('/exercises/:id/upload-frame', memoryUpload.single('frame'), async (req, res) => {
  try {
    const { id } = req.params;
    const { frame } = req.query;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const column = `frame_${frame}_url`;
    if (!['frame_1_url', 'frame_2_url', 'frame_3_url'].includes(column)) {
      return res.status(400).json({ message: 'Invalid frame number. Use frame=1,2,3' });
    }

    const processed = await sharp(req.file.buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const url = await uploadBufferToR2(processed, `frame_${frame}.webp`, 'image/webp');

    await pool.query(`
      INSERT INTO exercise_replacer (exercise_id, ${column}, status)
      VALUES ($1, $2, 'uploading')
      ON CONFLICT (exercise_id)
      DO UPDATE SET ${column} = $2, status = CASE
        WHEN exercise_replacer.frame_1_url IS NOT NULL
         AND exercise_replacer.frame_2_url IS NOT NULL
         AND exercise_replacer.frame_3_url IS NOT NULL THEN 'frames_ready'
        ELSE 'uploading'
      END, updated_at = CURRENT_TIMESTAMP
    `, [id, url]);

    res.json({ success: true, url, frame: parseInt(frame) });
  } catch (error) {
    console.error('Upload frame error:', error);
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
      'SELECT frame_1_url, frame_2_url, frame_3_url FROM exercise_replacer WHERE exercise_id = $1', [id]
    );

    if (!result.rows[0]?.frame_1_url) {
      return res.status(400).json({ message: 'No frames uploaded yet' });
    }

    const frameUrls = [result.rows[0].frame_1_url, result.rows[0].frame_2_url, result.rows[0].frame_3_url].filter(Boolean);

    const gifWidth = width || 300;
    const gifHeight = height || 300;
    const pixelCount = gifWidth * gifHeight;

    const gifDelay = Math.round((frame_delay || 200) / 10); // omggif uses centiseconds
    const gifLoop = loop_count === 0 ? 0 : (loop_count || 0);

    // Build palette from first frame using NeuQuant
    const firstBuf = await getFrameBufferFromUrl(frameUrls[0]);
    const firstRgba = await sharp(firstBuf)
      .resize(gifWidth, gifHeight)
      .ensureAlpha()
      .raw()
      .toBuffer();

    const firstRgb = rgbaToRgb(firstRgba);
    const nq = new NeuQuant(firstRgb, quality || 20);
    nq.buildColormap();

    // Convert NeuQuant palette ([r,g,b,...]) to omggif format ([rgb24,...])
    const nqPalette = nq.getColormap();
    const omggifPalette = [];
    for (let i = 0; i < 256; i++) {
      omggifPalette.push(
        (nqPalette[i * 3] << 16) | (nqPalette[i * 3 + 1] << 8) | nqPalette[i * 3 + 2]
      );
    }

    function indexPixels(rgba) {
      const indexed = new Uint8Array(pixelCount);
      for (let i = 0; i < pixelCount; i++) {
        indexed[i] = nq.lookupRGB(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
      }
      return indexed;
    }

    // Estimate buffer size and write GIF
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

    await pool.query(
      'UPDATE exercises SET gif_url = $1, image_url = $2 WHERE id = $3',
      [gifUrl, thumbnailUrl, id]
    );

    await pool.query(
      "UPDATE exercise_replacer SET status = 'replaced', updated_at = CURRENT_TIMESTAMP WHERE exercise_id = $1",
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
      `SELECT exercise_id, status, frame_1_url, frame_2_url, frame_3_url,
              reference_image_url, updated_at
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
