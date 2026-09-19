const { pool } = require('../../db');

/**
 * Look up entity image URLs from categories, body_parts, equipment, targets, muscle_groups.
 */
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

/**
 * Get one image per unique category.
 */
async function getCategories() {
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
  return result.rows;
}

/**
 * Get distinct values & counts for filter dropdowns.
 */
async function getFiltersMeta({ category, equipment }) {
  const catParam = category ? String(category).trim().toLowerCase() : null;
  const equipList = equipment ? String(equipment).split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];

  const equipConditions = ['equipment IS NOT NULL'];
  const equipParams = [];
  if (catParam) {
    equipConditions.push(`category = $${equipParams.length + 1}`);
    equipParams.push(catParam);
  }

  const targetConditions = ['target IS NOT NULL'];
  const targetParams = [];
  if (catParam) {
    targetConditions.push(`category = $${targetParams.length + 1}`);
    targetParams.push(catParam);
  }
  if (equipList.length === 1) {
    targetConditions.push(`equipment = $${targetParams.length + 1}`);
    targetParams.push(equipList[0]);
  } else if (equipList.length > 1) {
    const orClauses = equipList.map((_, i) => `equipment = $${targetParams.length + i + 1}`);
    targetConditions.push(`(${orClauses.join(' OR ')})`);
    targetParams.push(...equipList);
  }

  const [categoriesRes, bodyPartsRes, equipmentRes, targetsRes, muscleGroupsRes] = await Promise.all([
    pool.query(`
      SELECT category, MAX(category_image_url) AS image_url, COUNT(*)::int AS count
      FROM exercises
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY category ASC
    `),
    pool.query(`
      SELECT DISTINCT body_part
      FROM exercises
      WHERE body_part IS NOT NULL
      ORDER BY body_part ASC
    `),
    pool.query(`
      SELECT equipment, MAX(equipment_image_url) AS image_url, COUNT(*)::int AS count
      FROM exercises
      WHERE ${equipConditions.join(' AND ')}
      GROUP BY equipment
      ORDER BY count DESC, equipment ASC
    `, equipParams),
    pool.query(`
      SELECT target, MAX(target_image_url) AS image_url, COUNT(*)::int AS count
      FROM exercises
      WHERE ${targetConditions.join(' AND ')}
      GROUP BY target
      ORDER BY count DESC, target ASC
    `, targetParams),
    pool.query(`
      SELECT DISTINCT muscle_group
      FROM exercises
      WHERE muscle_group IS NOT NULL
      ORDER BY muscle_group ASC
    `),
  ]);

  return {
    categories:     categoriesRes.rows.map(r => r.category),
    body_parts:     bodyPartsRes.rows.map(r => r.body_part),
    equipment:      equipmentRes.rows.map(r => r.equipment),
    targets:        targetsRes.rows.map(r => r.target),
    muscle_groups:  muscleGroupsRes.rows.map(r => r.muscle_group),
    category_items: categoriesRes.rows.map(r => ({
      name: r.category,
      image_url: r.image_url,
      count: r.count,
    })),
    equipment_items: equipmentRes.rows.map(r => ({
      name: r.equipment,
      image_url: r.image_url,
      count: r.count,
    })),
    target_items: targetsRes.rows.map(r => ({
      name: r.target,
      image_url: r.image_url,
      count: r.count,
    })),
  };
}

/**
 * List exercises with filters & pagination.
 */
async function getExercises(filters) {
  const {
    category,
    body_part,
    equipment,
    target,
    muscle_group,
    q,
    min_rating,
    sort_by = 'name',
    sort_order = 'asc',
    page = 1,
    limit = 20,
  } = filters;

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

  return {
    data: rowsResult.rows,
    pagination: {
      page: Number(page),
      limit: pgLimit,
      total,
      totalPages: Math.ceil(total / pgLimit),
    },
  };
}

/**
 * Get single exercise by ID.
 */
async function getExerciseById(id) {
  const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

/**
 * Create a new exercise.
 */
async function createExercise(data) {
  const {
    id, name, category, body_part, equipment,
    instructions_en, instructions_tr,
    instruction_steps_en, instruction_steps_tr,
    muscle_group, secondary_muscles, target,
    image_url, gif_url, gif_prompt,
  } = data;

  const entityImages = await getEntityImageUrls({
    category, body_part, equipment, target, muscle_group,
  });

  const result = await pool.query(
    `INSERT INTO exercises
      (id, name, category, body_part, equipment,
       instructions_en, instructions_tr,
       instruction_steps_en, instruction_steps_tr,
       muscle_group, secondary_muscles, target,
       image_url, gif_url, gif_prompt,
       category_image_url, body_part_image_url,
       equipment_image_url, target_image_url,
       muscle_group_image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
             $15,$16,$17,$18,$19,$20)
     RETURNING *`,
    [
      id, name, category || null, body_part || null, equipment || null,
      instructions_en || null, instructions_tr || null,
      instruction_steps_en || [], instruction_steps_tr || [],
      muscle_group || null, secondary_muscles || [], target || null,
      image_url || null, gif_url || null, gif_prompt || null,
      entityImages.category_image_url,
      entityImages.body_part_image_url,
      entityImages.equipment_image_url,
      entityImages.target_image_url,
      entityImages.muscle_group_image_url,
    ]
  );

  return result.rows[0];
}

/**
 * Update existing exercise.
 */
async function updateExercise(id, data) {
  const {
    name, category, body_part, equipment,
    instructions_en, instructions_tr,
    instruction_steps_en, instruction_steps_tr,
    muscle_group, secondary_muscles, target,
    image_url, gif_url, gif_prompt,
  } = data;

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
      gif_prompt            = COALESCE($14, gif_prompt),
      category_image_url    = COALESCE($15, category_image_url),
      body_part_image_url   = COALESCE($16, body_part_image_url),
      equipment_image_url   = COALESCE($17, equipment_image_url),
      target_image_url      = COALESCE($18, target_image_url),
      muscle_group_image_url= COALESCE($19, muscle_group_image_url)
     WHERE id = $20
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
      gif_prompt  || null,
      entityImages.category_image_url,
      entityImages.body_part_image_url,
      entityImages.equipment_image_url,
      entityImages.target_image_url,
      entityImages.muscle_group_image_url,
      id,
    ]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0];
}

/**
 * Delete exercise by ID.
 */
async function deleteExercise(id) {
  const result = await pool.query('DELETE FROM exercises WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
}

module.exports = {
  getEntityImageUrls,
  getCategories,
  getFiltersMeta,
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
};
