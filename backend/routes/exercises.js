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

// ─── Helper: look up entity image URLs ────────────────────────────────────────
async function getEntityImageUrls({ category, body_part, equipment, target, muscle_group }) {
  const [cat, bp, eq, tgt, mg] = await Promise.all([
    category ? pool.query('SELECT image_url FROM categories WHERE name = $1', [category]) : Promise.resolve({ rows: [{ image_url: null }] }),
    body_part ? pool.query('SELECT image_url FROM body_parts WHERE name = $1', [body_part]) : Promise.resolve({ rows: [{ image_url: null }] }),
    equipment ? pool.query('SELECT image_url FROM equipment WHERE name = $1', [equipment]) : Promise.resolve({ rows: [{ image_url: null }] }),
    target ? pool.query('SELECT image_url FROM targets WHERE name = $1', [target]) : Promise.resolve({ rows: [{ image_url: null }] }),
    muscle_group ? pool.query('SELECT image_url FROM muscle_groups WHERE name = $1', [muscle_group]) : Promise.resolve({ rows: [{ image_url: null }] }),
  ]);
  return {
    category_image_url: cat.rows[0]?.image_url ?? null,
    body_part_image_url: bp.rows[0]?.image_url ?? null,
    equipment_image_url: eq.rows[0]?.image_url ?? null,
    target_image_url: tgt.rows[0]?.image_url ?? null,
    muscle_group_image_url: mg.rows[0]?.image_url ?? null,
  };
}

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
    const { category } = req.query;

    const categoryFilter = category ? ' AND category = $1' : '';
    const filterParam = category || null;

    const [categories, bodyParts, equipment, targets, muscleGroups] = await Promise.all([
      pool.query('SELECT DISTINCT category   FROM exercises WHERE category   IS NOT NULL ORDER BY category'),
      filterParam
        ? pool.query(`SELECT DISTINCT body_part  FROM exercises WHERE body_part  IS NOT NULL${categoryFilter} ORDER BY body_part`, [filterParam])
        : pool.query('SELECT DISTINCT body_part  FROM exercises WHERE body_part  IS NOT NULL ORDER BY body_part'),
      filterParam
        ? pool.query(`SELECT DISTINCT equipment  FROM exercises WHERE equipment  IS NOT NULL${categoryFilter} ORDER BY equipment`, [filterParam])
        : pool.query('SELECT DISTINCT equipment  FROM exercises WHERE equipment  IS NOT NULL ORDER BY equipment'),
      filterParam
        ? pool.query(`SELECT DISTINCT target     FROM exercises WHERE target     IS NOT NULL${categoryFilter} ORDER BY target`, [filterParam])
        : pool.query('SELECT DISTINCT target     FROM exercises WHERE target     IS NOT NULL ORDER BY target'),
      filterParam
        ? pool.query(`SELECT DISTINCT muscle_group FROM exercises WHERE muscle_group IS NOT NULL${categoryFilter} ORDER BY muscle_group`, [filterParam])
        : pool.query('SELECT DISTINCT muscle_group FROM exercises WHERE muscle_group IS NOT NULL ORDER BY muscle_group'),
    ]);
    res.json({
      categories:     categories.rows.map(r => r.category),
      body_parts:     bodyParts.rows.map(r => r.body_part),
      equipment:      equipment.rows.map(r => r.equipment),
      targets:        targets.rows.map(r => r.target),
      muscle_groups:  muscleGroups.rows.map(r => r.muscle_group),
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
      min_rating,
      sort_by  = 'name',
      sort_order = 'asc',
      page  = 1,
      limit = 20,
    } = req.query;

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    function addExactFilter(col, vals) {
      if (!vals) return;
      const parts = String(vals).split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length === 0) return;
      if (parts.length === 1) {
        conditions.push(`${col} = $${idx++}`);
        params.push(parts[0]);
      } else {
        const orClauses = parts.map(() => `${col} = $${idx++}`);
        conditions.push(`(${orClauses.join(' OR ')})`);
        params.push(...parts);
      }
    }

    addExactFilter('category',    category);
    addExactFilter('body_part',   body_part);
    addExactFilter('equipment',   equipment);
    addExactFilter('target',      target);
    addExactFilter('muscle_group', muscle_group);
    if (q)            { conditions.push(`name ILIKE $${idx++}`); params.push(`%${q}%`); }
    if (min_rating)   { conditions.push(`avg_rating >= $${idx++}::float8`); params.push(Number(min_rating)); }

    const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset  = (Number(page) - 1) * Number(limit);
    const pgLimit = Number(limit);

    const allowedSorts = ['name', 'avg_rating'];
    const sortCol = allowedSorts.includes(sort_by) ? sort_by : 'name';
    const sortDir = sort_order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const orderClause = `ORDER BY e.${sortCol} ${sortDir}`;

    const selectQuery = 
      `SELECT e.id, e.name, e.category, e.body_part, e.equipment,
              e.muscle_group, e.secondary_muscles, e.target,
              e.image_url, e.gif_url, e.instructions_en,
              e.avg_rating::float8 AS avg_rating, e.rating_count,
              e.category_image_url, e.body_part_image_url,
              e.equipment_image_url, e.target_image_url,
              e.muscle_group_image_url
       FROM exercises e ${where}
       ${orderClause}
       LIMIT $${idx} OFFSET $${idx + 1}`;

    const queryParams = [...params, pgLimit, offset];

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

    const queryText = `SELECT * FROM exercises WHERE id = $1`;
    const params = [id];
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

    const entityImages = await getEntityImageUrls({
      category, body_part, equipment, target, muscle_group,
    });

    const result = await pool.query(
      `INSERT INTO exercises
        (id, name, category, body_part, equipment,
         instructions_en, instructions_tr,
         instruction_steps_en, instruction_steps_tr,
         muscle_group, secondary_muscles, target,
         image_url, gif_url,
         category_image_url, body_part_image_url,
         equipment_image_url, target_image_url,
         muscle_group_image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
               $15,$16,$17,$18,$19)
       RETURNING *`,
      [
        id, name, category || null, body_part || null, equipment || null,
        instructions_en || null, instructions_tr || null,
        instruction_steps_en || [], instruction_steps_tr || [],
        muscle_group || null, secondary_muscles || [], target || null,
        image_url || null, gif_url || null,
        entityImages.category_image_url,
        entityImages.body_part_image_url,
        entityImages.equipment_image_url,
        entityImages.target_image_url,
        entityImages.muscle_group_image_url,
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

    const entityImages = await getEntityImageUrls({
      category, body_part, equipment, target, muscle_group,
    });

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
        gif_url               = COALESCE($13, gif_url),
        category_image_url    = COALESCE($14, category_image_url),
        body_part_image_url   = COALESCE($15, body_part_image_url),
        equipment_image_url   = COALESCE($16, equipment_image_url),
        target_image_url      = COALESCE($17, target_image_url),
        muscle_group_image_url= COALESCE($18, muscle_group_image_url)
       WHERE id = $19
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
        entityImages.category_image_url,
        entityImages.body_part_image_url,
        entityImages.equipment_image_url,
        entityImages.target_image_url,
        entityImages.muscle_group_image_url,
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
