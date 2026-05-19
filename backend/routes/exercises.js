/**
 * routes/exercises.js
 * Base: /api/exercises
 *
 * GET    /                     – list (filter: category, body_part, equipment, target, q, page, limit)
 * GET    /:id                  – single exercise
 * POST   /                     – create (admin-only in future; open for now)
 * PUT    /:id                  – update
 * DELETE /:id                  – delete
 * GET    /meta/filters         – distinct values for filter dropdowns
 */

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

// ─── Middleware: simple JWT auth (re-used from profile routes) ────────────────
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── GET /categories ── one image per unique category ────────────────────────
router.get('/categories', async (req, res) => {
  try {
    // DISTINCT ON picks one row per category — the one with the lowest id
    // ensuring we always get the same stable representative image
    const result = await pool.query(`
      SELECT DISTINCT ON (category)
        category,
        image_url,
        COUNT(*) OVER (PARTITION BY category) AS exercise_count
      FROM exercises
      WHERE category IS NOT NULL
        AND image_url IS NOT NULL
      ORDER BY category, id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /exercises/categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ─── GET /meta/filters ── must come BEFORE /:id ──────────────────────────────
router.get('/meta/filters', async (req, res) => {
  try {
    const [categories, bodyParts, equipment, targets] = await Promise.all([
      pool.query('SELECT DISTINCT category   FROM exercises WHERE category   IS NOT NULL ORDER BY category'),
      pool.query('SELECT DISTINCT body_part  FROM exercises WHERE body_part  IS NOT NULL ORDER BY body_part'),
      pool.query('SELECT DISTINCT equipment  FROM exercises WHERE equipment  IS NOT NULL ORDER BY equipment'),
      pool.query('SELECT DISTINCT target     FROM exercises WHERE target     IS NOT NULL ORDER BY target'),
    ]);
    res.json({
      categories:  categories.rows.map(r => r.category),
      body_parts:  bodyParts.rows.map(r => r.body_part),
      equipment:   equipment.rows.map(r => r.equipment),
      targets:     targets.rows.map(r => r.target),
    });
  } catch (err) {
    console.error('GET /exercises/meta/filters error:', err);
    res.status(500).json({ error: 'Failed to fetch filter metadata' });
  }
});

// ─── GET / ─── List with filters & pagination ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      category,
      body_part,
      equipment,
      target,
      muscle_group,
      q,           // search term (name)
      page  = 1,
      limit = 20,
    } = req.query;

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (category)     { conditions.push(`category    ILIKE $${idx++}`); params.push(category); }
    if (body_part)    { conditions.push(`body_part   ILIKE $${idx++}`); params.push(body_part); }
    if (equipment)    { conditions.push(`equipment   ILIKE $${idx++}`); params.push(equipment); }
    if (target)       { conditions.push(`target      ILIKE $${idx++}`); params.push(target); }
    if (muscle_group) { conditions.push(`muscle_group ILIKE $${idx++}`); params.push(muscle_group); }
    if (q)            { conditions.push(`name        ILIKE $${idx++}`); params.push(`%${q}%`); }

    const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset  = (Number(page) - 1) * Number(limit);
    const pgLimit = Number(limit);

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) {}
    }

    const selectQuery = userId ? 
      `SELECT e.id, e.name, e.category, e.body_part, e.equipment,
              e.muscle_group, e.secondary_muscles, e.target,
              e.image_url, e.gif_url,
              (SELECT ROUND(AVG(dwe2.rating), 1)::float
               FROM daily_workout_exercises dwe2
               JOIN daily_workouts dw2 ON dwe2.daily_workout_id = dw2.id
               WHERE dwe2.exercise_id = e.id AND dw2.user_id = $${idx + 2} AND dwe2.rating IS NOT NULL) AS avg_rating
       FROM exercises e ${where}
       ORDER BY e.name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`
      :
      `SELECT id, name, category, body_part, equipment,
              muscle_group, secondary_muscles, target,
              image_url, gif_url
       FROM exercises ${where}
       ORDER BY name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`;

    const queryParams = userId ? [...params, pgLimit, offset, userId] : [...params, pgLimit, offset];

    const [rowsResult, countResult] = await Promise.all([
      pool.query(selectQuery, queryParams),
      pool.query(`SELECT COUNT(*) FROM exercises ${where}`, params),
    ]);

    const total = Number(countResult.rows[0].count);

    res.json({
      data:       rowsResult.rows,
      pagination: {
        page:       Number(page),
        limit:      pgLimit,
        total,
        totalPages: Math.ceil(total / pgLimit),
      },
    });
  } catch (err) {
    console.error('GET /exercises error:', err);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// ─── GET /:id ─── Single exercise (full detail) ───────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) {}
    }

    const queryText = userId ?
      `SELECT e.*,
         (SELECT ROUND(AVG(dwe2.rating), 1)::float
          FROM daily_workout_exercises dwe2
          JOIN daily_workouts dw2 ON dwe2.daily_workout_id = dw2.id
          WHERE dwe2.exercise_id = e.id AND dw2.user_id = $2 AND dwe2.rating IS NOT NULL) AS avg_rating
       FROM exercises e
       WHERE e.id = $1`
      :
      `SELECT * FROM exercises WHERE id = $1`;

    const params = userId ? [id, userId] : [id];
    const result = await pool.query(queryText, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /exercises/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch exercise' });
  }
});

// ─── POST / ─── Create ────────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      id, name, category, body_part, equipment,
      instructions_en, instructions_tr,
      instruction_steps_en, instruction_steps_tr,
      muscle_group, secondary_muscles, target,
      image_url, gif_url,
    } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'id and name are required' });
    }

    const result = await pool.query(
      `INSERT INTO exercises
        (id, name, category, body_part, equipment,
         instructions_en, instructions_tr,
         instruction_steps_en, instruction_steps_tr,
         muscle_group, secondary_muscles, target,
         image_url, gif_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        id, name, category || null, body_part || null, equipment || null,
        instructions_en || null, instructions_tr || null,
        instruction_steps_en || [], instruction_steps_tr || [],
        muscle_group || null, secondary_muscles || [], target || null,
        image_url || null, gif_url || null,
      ]
    );

    res.status(201).json({ success: true, exercise: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Exercise with this id already exists' });
    }
    console.error('POST /exercises error:', err);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

// ─── PUT /:id ─── Update ─────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, category, body_part, equipment,
      instructions_en, instructions_tr,
      instruction_steps_en, instruction_steps_tr,
      muscle_group, secondary_muscles, target,
      image_url, gif_url,
    } = req.body;

    const result = await pool.query(
      `UPDATE exercises SET
        name                  = COALESCE($1,  name),
        category              = COALESCE($2,  category),
        body_part             = COALESCE($3,  body_part),
        equipment             = COALESCE($4,  equipment),
        instructions_en       = COALESCE($5,  instructions_en),
        instructions_tr       = COALESCE($6,  instructions_tr),
        instruction_steps_en  = COALESCE($7,  instruction_steps_en),
        instruction_steps_tr  = COALESCE($8,  instruction_steps_tr),
        muscle_group          = COALESCE($9,  muscle_group),
        secondary_muscles     = COALESCE($10, secondary_muscles),
        target                = COALESCE($11, target),
        image_url             = COALESCE($12, image_url),
        gif_url               = COALESCE($13, gif_url)
       WHERE id = $14
       RETURNING *`,
      [
        name        || null,
        category    || null,
        body_part   || null,
        equipment   || null,
        instructions_en  || null,
        instructions_tr  || null,
        instruction_steps_en || null,
        instruction_steps_tr || null,
        muscle_group || null,
        secondary_muscles || null,
        target      || null,
        image_url   || null,
        gif_url     || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    res.json({ success: true, exercise: result.rows[0] });
  } catch (err) {
    console.error('PUT /exercises/:id error:', err);
    res.status(500).json({ error: 'Failed to update exercise' });
  }
});

// ─── DELETE /:id ─────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM exercises WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    res.json({ success: true, deleted: id });
  } catch (err) {
    console.error('DELETE /exercises/:id error:', err);
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

module.exports = router;
