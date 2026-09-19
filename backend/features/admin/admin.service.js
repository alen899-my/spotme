'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../db');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const upload = require('../../utils/upload');

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

// ─── Build helpers ────────────────────────────────────────────────────────────
const BUILD_CHANNELS = ['production', 'preview', 'development'];

function parseBuildFlag(value) {
  if (value === undefined) return null;
  return value === true || value === 'true' || value === '1' || value === 1;
}

async function promoteLatestBuild(channel) {
  await pool.query(
    `UPDATE app_builds SET is_latest = TRUE WHERE id = (
       SELECT id FROM app_builds WHERE build_channel = $1
       ORDER BY created_at DESC, id DESC LIMIT 1
     )`,
    [channel]
  );
}

async function deleteBuildFile(fileKey) {
  if (!fileKey) return;
  try {
    await upload.s3.send(new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: fileKey,
    }));
  } catch (err) {
    console.error('Admin delete build file from R2 failed:', err.message);
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function adminLogin({ email, password }) {
  const result = await pool.query(
    'SELECT id, full_name AS name, email, password FROM users WHERE email = $1 AND role = $2',
    [email, 'admin']
  );
  if (result.rows.length === 0) return null;

  const admin = result.rows[0];
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return null;

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: 'admin' },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: '24h' }
  );
  return { token, admin: { id: admin.id, email: admin.email, name: admin.name } };
}

async function getAdminMe(adminId) {
  const result = await pool.query(
    'SELECT id, full_name AS name, email, created_at FROM users WHERE id = $1',
    [adminId]
  );
  return result.rows[0] || null;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function getDashboardStats() {
  const [users, workouts, meals, activeUsers, waterLogs, activeWorkouts] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM users'),
    pool.query("SELECT COUNT(*)::int AS count FROM daily_workouts WHERE status = 'completed'"),
    pool.query('SELECT COUNT(*)::int AS count FROM meals'),
    pool.query("SELECT COUNT(*)::int AS count FROM daily_workouts WHERE completed_at > NOW() - INTERVAL '7 days'"),
    pool.query('SELECT COUNT(*)::int AS count FROM water_logs'),
    pool.query("SELECT COUNT(*)::int AS count FROM daily_workouts WHERE status = 'active'"),
  ]);
  return {
    totalUsers: users.rows[0].count,
    totalWorkouts: workouts.rows[0].count,
    totalMeals: meals.rows[0].count,
    activeUsers: activeUsers.rows[0].count,
    totalWaterLogs: waterLogs.rows[0].count,
    activeWorkoutsNow: activeWorkouts.rows[0].count,
  };
}

// ─── User CRUD ────────────────────────────────────────────────────────────────
async function listUsers({ page = 1, limit = 20, search, sortBy, sortOrder }) {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause = `WHERE (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const sortMap = {
    name: 'full_name',
    email: 'email',
    role: 'role',
    status: 'status',
    plan: 'plan',
    joinedAt: 'created_at',
  };
  const col = sortMap[String(sortBy)] || 'created_at';
  const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY ${col} ${dir}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM users ${whereClause}`, params
  );
  const dataResult = await pool.query(
    `SELECT id, full_name AS name, email, phone_number AS phone, role, status, plan,
            created_at AS "joinedAt", username, gender, dob, is_private,
            onboarding_completed, total_xp, league_tier, profile_pic_url AS avatar,
            age, height, weight, body_fat, fitness_goal, experience_level, activity_level,
            target_weight, meals_per_day, share_splits
     FROM users ${whereClause}
     ${orderClause}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );
  return { users: dataResult.rows, total: countResult.rows[0].total };
}

async function getUserById(id) {
  const result = await pool.query(
    `SELECT id, full_name AS name, email, phone_number AS phone, role, status, plan,
            created_at AS "joinedAt", username, gender, dob, is_private,
            onboarding_completed, total_xp, league_tier, profile_pic_url AS avatar,
            age, height, weight, body_fat, fitness_goal, experience_level, activity_level,
            neck, waist, hip, chest, arm, thigh,
            medical_conditions, medication, allergies, diet_type, food_preference,
            water_intake, food_allergies, target_weight, meals_per_day, share_splits,
            completed_steps, water_reminder_enabled, water_reminder_interval,
            last_water_reminded_at, motivation_enabled, last_motivation_sent_at,
            water_goal_date, prev_rank, front_photo_url, back_photo_url, side_photo_url
     FROM users WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;

  const stats = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM daily_workouts WHERE user_id = $1 AND status = 'completed'", [id]),
    pool.query('SELECT COUNT(*)::int AS count FROM meals WHERE user_id = $1', [id]),
    pool.query('SELECT COUNT(*)::int AS count FROM water_logs WHERE user_id = $1', [id]),
    pool.query("SELECT MAX(completed_at) AS last_active FROM daily_workouts WHERE user_id = $1 AND status = 'completed'", [id]),
  ]);

  const user = result.rows[0];
  user.totalWorkouts = stats[0].rows[0].count;
  user.totalMeals = stats[1].rows[0].count;
  user.totalWaterLogs = stats[2].rows[0].count;
  user.lastActiveAt = stats[3].rows[0].last_active || user.joinedAt;
  return user;
}

async function updateUser(id, { name, email, role, status, plan, phone }) {
  const result = await pool.query(
    `UPDATE users SET
      full_name = COALESCE($1, full_name),
      email = COALESCE($2, email),
      role = COALESCE($3, role),
      status = COALESCE($4, status),
      plan = COALESCE($5, plan),
      phone_number = COALESCE($6, phone_number)
     WHERE id = $7
     RETURNING id, full_name AS name, email, phone_number AS phone, role, status, plan,
               created_at AS "joinedAt"`,
    [name, email, role, status, plan, phone, id]
  );
  return result.rows[0] || null;
}

async function deleteUser(id) {
  const result = await pool.query(
    'DELETE FROM users WHERE id = $1 RETURNING id', [id]
  );
  return result.rows[0] || null;
}

// ─── Feedback CRUD ────────────────────────────────────────────────────────────
async function listFeedback({ page = 1, limit = 20, search, sortBy, sortOrder }) {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause = `WHERE (f.title ILIKE $${paramIndex} OR f.description ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const sortMap = {
    id: 'f.id',
    title: 'f.title',
    category: 'f.category',
    created_at: 'f.created_at',
    userName: 'u.full_name',
  };
  const col = sortMap[String(sortBy)] || 'f.created_at';
  const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM feedback f LEFT JOIN users u ON f.user_id = u.id ${whereClause}`,
    params
  );
  const dataResult = await pool.query(
    `SELECT f.id, f.user_id, f.category, f.title, f.description, f.created_at,
            u.full_name AS "userName", u.email AS "userEmail", u.profile_pic_url AS "userAvatar"
     FROM feedback f
     LEFT JOIN users u ON f.user_id = u.id
     ${whereClause}
     ORDER BY ${col} ${dir}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );
  return { feedbacks: dataResult.rows, total: countResult.rows[0].total };
}

async function deleteFeedback(id) {
  const result = await pool.query(
    'DELETE FROM feedback WHERE id = $1 RETURNING id', [id]
  );
  return result.rows[0] || null;
}

// ─── Active Users ─────────────────────────────────────────────────────────────
async function getActiveUsers({ page = 1, limit = 20, search }) {
  const offset = (page - 1) * limit;

  const onlineRes = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM users
    WHERE last_active_at > NOW() - INTERVAL '5 minutes'
  `);
  const todayRes = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM users
    WHERE last_active_at >= CURRENT_DATE
  `);
  const weekRes = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM users
    WHERE last_active_at >= DATE_TRUNC('week', CURRENT_DATE)
  `);
  const dailyRes = await pool.query(`
    SELECT DATE(last_active_at) AS date, COUNT(DISTINCT id) AS count
    FROM users
    WHERE last_active_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(last_active_at)
    ORDER BY date DESC
  `);

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM users u ${whereClause}`, params
  );
  const usersRes = await pool.query(
    `SELECT u.id, u.full_name AS name, u.email, u.status, u.profile_pic_url,
            u.last_active_at, u.created_at,
            (SELECT COUNT(*)::int FROM daily_workouts WHERE user_id = u.id AND status = 'completed') AS total_workouts
     FROM users u ${whereClause}
     ORDER BY u.last_active_at DESC NULLS LAST
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  return {
    online: onlineRes.rows[0].count,
    activeToday: todayRes.rows[0].count,
    activeWeek: weekRes.rows[0].count,
    dailyStats: dailyRes.rows,
    users: usersRes.rows,
    total: countRes.rows[0].total,
  };
}

// ─── Exercise CRUD ────────────────────────────────────────────────────────────
async function createExercise({ body, files }) {
  const {
    name, category, body_part, equipment, target,
    muscle_group, secondary_muscles, instructions_en,
  } = body;

  const maxResult = await pool.query('SELECT MAX(CAST(id AS INTEGER)) AS max_id FROM exercises');
  const nextId = String((maxResult.rows[0].max_id || 0) + 1).padStart(4, '0');

  const getFileUrl = (fieldname) => {
    if (files?.[fieldname]?.[0]) {
      return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${files[fieldname][0].key}`;
    }
    return null;
  };

  const imageUrl = getFileUrl('image');
  const gifUrl = getFileUrl('gif');

  const secondaryArray = secondary_muscles
    ? secondary_muscles.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const entityImages = await getEntityImageUrls({ category, body_part, equipment, target, muscle_group });

  const result = await pool.query(
    `INSERT INTO exercises
      (id, name, category, body_part, equipment, target,
       muscle_group, secondary_muscles, instructions_en,
       image_url, gif_url,
       category_image_url, body_part_image_url,
       equipment_image_url, target_image_url,
       muscle_group_image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
             $12,$13,$14,$15,$16)
     RETURNING *`,
    [nextId, name, category || null, body_part || null, equipment || null,
     target || null, muscle_group || null, secondaryArray,
     instructions_en || null, imageUrl, gifUrl,
     entityImages.category_image_url,
     entityImages.body_part_image_url,
     entityImages.equipment_image_url,
     entityImages.target_image_url,
     entityImages.muscle_group_image_url]
  );
  return result.rows[0];
}

async function updateExercise(id, { body, files }) {
  const existing = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
  if (existing.rows.length === 0) return null;

  const {
    name, category, body_part, equipment, target,
    muscle_group, secondary_muscles, instructions_en,
  } = body;

  const getFileUrl = (fieldname) => {
    if (files?.[fieldname]?.[0]) {
      return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${files[fieldname][0].key}`;
    }
    return null;
  };

  const imageUrl = body.remove_image === '1'
    ? null
    : (getFileUrl('image') || existing.rows[0].image_url);
  const gifUrl = body.remove_gif === '1'
    ? null
    : (getFileUrl('gif') || existing.rows[0].gif_url);

  const secondaryArray = secondary_muscles
    ? secondary_muscles.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const entityImages = await getEntityImageUrls({ category, body_part, equipment, target, muscle_group });

  const result = await pool.query(
    `UPDATE exercises SET
      name = $1, category = $2, body_part = $3, equipment = $4,
      target = $5, muscle_group = $6, secondary_muscles = $7,
      instructions_en = $8, image_url = $9, gif_url = $10,
      category_image_url = $11, body_part_image_url = $12,
      equipment_image_url = $13, target_image_url = $14,
      muscle_group_image_url = $15
     WHERE id = $16
     RETURNING *`,
    [name, category || null, body_part || null, equipment || null,
     target || null, muscle_group || null, secondaryArray,
     instructions_en || null, imageUrl, gifUrl,
     entityImages.category_image_url,
     entityImages.body_part_image_url,
     entityImages.equipment_image_url,
     entityImages.target_image_url,
     entityImages.muscle_group_image_url, id]
  );
  return result.rows[0];
}

// ─── Workout Splits CRUD ──────────────────────────────────────────────────────
async function listSplits({ page = 1, limit = 20, search, sortBy, sortOrder }) {
  const offset = (page - 1) * limit;
  let whereClause = 'WHERE s.is_template = true';
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const col = sortBy === 'name' ? 's.name' : 's.created_at';
  const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM workout_splits s ${whereClause}`, params
  );
  const dataResult = await pool.query(
    `SELECT s.*,
      (SELECT COUNT(*) FROM workout_sessions WHERE split_id = s.id) AS session_count
     FROM workout_splits s ${whereClause}
     ORDER BY ${col} ${dir}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );
  return { splits: dataResult.rows, total: countResult.rows[0].total };
}

async function getSplitById(id) {
  const splitRes = await pool.query(
    'SELECT * FROM workout_splits WHERE id = $1 AND is_template = true', [id]
  );
  if (splitRes.rows.length === 0) return null;

  const sessionsRes = await pool.query(
    'SELECT * FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order ASC', [id]
  );

  const sessionIds = sessionsRes.rows.map(s => s.id);
  let exercises = [];
  if (sessionIds.length > 0) {
    const exRes = await pool.query(
      `SELECT wse.*, e.name, e.category, e.image_url, e.target, e.equipment
       FROM workout_session_exercises wse
       JOIN exercises e ON wse.exercise_id = e.id
       WHERE wse.session_id = ANY($1::int[])
       ORDER BY wse.sort_order ASC`,
      [sessionIds]
    );
    exercises = exRes.rows;
  }

  const sessions = sessionsRes.rows.map(sess => ({
    ...sess,
    exercises: exercises.filter(e => e.session_id === sess.id),
  }));

  return { ...splitRes.rows[0], sessions };
}

async function createSplit({ name, description, sessions }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const splitRes = await client.query(
      `INSERT INTO workout_splits (user_id, name, description, is_template)
       VALUES (NULL, $1, $2, true) RETURNING *`,
      [name.trim(), description || null]
    );
    const split = splitRes.rows[0];

    if (Array.isArray(sessions)) {
      for (let i = 0; i < sessions.length; i++) {
        const sess = sessions[i];
        const sessRes = await client.query(
          'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
          [split.id, sess.name || `Day ${i + 1}`, i]
        );
        const session = sessRes.rows[0];

        if (Array.isArray(sess.exercises)) {
          for (let j = 0; j < sess.exercises.length; j++) {
            const ex = sess.exercises[j];
            await client.query(
              'INSERT INTO workout_session_exercises (session_id, exercise_id, sets, reps, rest_time, weight, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [session.id, ex.exercise_id, ex.sets || 3, ex.reps || '8-12', ex.rest_time || '60s', ex.weight || '0', j]
            );
          }
        }
      }
    }

    await client.query('COMMIT');

    const fullRes = await pool.query('SELECT * FROM workout_splits WHERE id = $1', [split.id]);
    const sessionsRes = await pool.query(
      'SELECT * FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order', [split.id]
    );
    const sessionIds = sessionsRes.rows.map(s => s.id);
    let exercises = [];
    if (sessionIds.length > 0) {
      const exRes = await pool.query(
        `SELECT wse.*, e.name, e.category, e.image_url, e.target, e.equipment
         FROM workout_session_exercises wse
         JOIN exercises e ON wse.exercise_id = e.id
         WHERE wse.session_id = ANY($1::int[])
         ORDER BY wse.sort_order`,
        [sessionIds]
      );
      exercises = exRes.rows;
    }
    const sessionsWithEx = sessionsRes.rows.map(sess => ({
      ...sess,
      exercises: exercises.filter(e => e.session_id === sess.id),
    }));

    return { ...fullRes.rows[0], sessions: sessionsWithEx };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function updateSplit(id, { name, description, sessions }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM workout_splits WHERE id = $1 AND is_template = true', [id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      'UPDATE workout_splits SET name = $1, description = $2 WHERE id = $3',
      [name || null, description || null, id]
    );

    await client.query('DELETE FROM workout_sessions WHERE split_id = $1', [id]);

    if (Array.isArray(sessions)) {
      for (let i = 0; i < sessions.length; i++) {
        const sess = sessions[i];
        const sessRes = await client.query(
          'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
          [id, sess.name || `Day ${i + 1}`, i]
        );
        const session = sessRes.rows[0];

        if (Array.isArray(sess.exercises)) {
          for (let j = 0; j < sess.exercises.length; j++) {
            const ex = sess.exercises[j];
            await client.query(
              'INSERT INTO workout_session_exercises (session_id, exercise_id, sets, reps, rest_time, weight, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [session.id, ex.exercise_id, ex.sets || 3, ex.reps || '8-12', ex.rest_time || '60s', ex.weight || '0', j]
            );
          }
        }
      }
    }

    await client.query('COMMIT');

    const fullRes = await pool.query('SELECT * FROM workout_splits WHERE id = $1', [id]);
    const sessionsRes = await pool.query(
      'SELECT * FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order', [id]
    );
    const sessionIds = sessionsRes.rows.map(s => s.id);
    let exercises = [];
    if (sessionIds.length > 0) {
      const exRes = await pool.query(
        `SELECT wse.*, e.name, e.category, e.image_url, e.target, e.equipment
         FROM workout_session_exercises wse
         JOIN exercises e ON wse.exercise_id = e.id
         WHERE wse.session_id = ANY($1::int[])
         ORDER BY wse.sort_order`,
        [sessionIds]
      );
      exercises = exRes.rows;
    }
    const sessionsWithEx = sessionsRes.rows.map(sess => ({
      ...sess,
      exercises: exercises.filter(e => e.session_id === sess.id),
    }));

    return { ...fullRes.rows[0], sessions: sessionsWithEx };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function deleteSplit(id) {
  const result = await pool.query(
    'DELETE FROM workout_splits WHERE id = $1 AND is_template = true RETURNING id', [id]
  );
  return result.rows[0] || null;
}

// ─── Entity Library CRUD (generic) ───────────────────────────────────────────
const exerciseCascadeMap = {
  categories:   { col: 'category',     imgCol: 'category_image_url' },
  body_parts:   { col: 'body_part',    imgCol: 'body_part_image_url' },
  equipment:    { col: 'equipment',    imgCol: 'equipment_image_url' },
  targets:      { col: 'target',       imgCol: 'target_image_url' },
  muscle_groups:{ col: 'muscle_group', imgCol: 'muscle_group_image_url' },
};

async function listEntities(table, { page = 1, limit = 50, search, sortBy, sortOrder }) {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause = `WHERE name ILIKE $${paramIndex}`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const col = sortBy === 'name' ? 'name' : 'created_at';
  const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM ${table} ${whereClause}`, params
  );
  const dataResult = await pool.query(
    `SELECT * FROM ${table} ${whereClause} ORDER BY ${col} ${dir} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );
  return { rows: dataResult.rows, total: countResult.rows[0].total };
}

async function getEntityById(table, id) {
  const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function createEntity(table, { name, file }) {
  const imageUrl = file
    ? `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${file.key}`
    : null;
  const result = await pool.query(
    `INSERT INTO ${table} (name, image_url) VALUES ($1, $2) RETURNING *`,
    [name, imageUrl]
  );
  return result.rows[0];
}

async function updateEntity(table, id, { name, file, remove_image }) {
  const existing = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  if (existing.rows.length === 0) return null;

  const imageUrl = file
    ? `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${file.key}`
    : (remove_image === '1' ? null : existing.rows[0].image_url);

  const result = await pool.query(
    `UPDATE ${table} SET name = COALESCE($1, name), image_url = $2 WHERE id = $3 RETURNING *`,
    [name || null, imageUrl, id]
  );

  const cascade = exerciseCascadeMap[table];
  if (cascade && existing.rows[0].name) {
    await pool.query(
      `UPDATE exercises SET ${cascade.imgCol} = $1 WHERE ${cascade.col} = $2`,
      [imageUrl, existing.rows[0].name]
    );
  }

  return result.rows[0];
}

async function deleteEntity(table, id) {
  const result = await pool.query(
    `DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]
  );
  return result.rows[0] || null;
}

// ─── App Builds CRUD ──────────────────────────────────────────────────────────
async function listBuilds({ page = 1, limit = 50, search, sortBy, sortOrder }) {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause = `WHERE (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR version ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const allowedSort = ['created_at', 'title', 'version', 'file_size'];
  const col = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM app_builds ${whereClause}`, params
  );
  const dataResult = await pool.query(
    `SELECT * FROM app_builds ${whereClause} ORDER BY ${col} ${dir} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );
  return { builds: dataResult.rows, total: countResult.rows[0].total };
}

async function getBuildById(id) {
  const result = await pool.query('SELECT * FROM app_builds WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function createBuild({ title, description, build_channel, version, version_code, force_update, file }) {
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();
  if (!['apk', 'aab'].includes(ext)) {
    await deleteBuildFile(file.key);
    const err = new Error('Only .apk and .aab files are allowed');
    err.statusCode = 400;
    throw err;
  }

  const fileKey = file.key;
  const fileUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileKey}`;

  await pool.query('UPDATE app_builds SET is_latest = FALSE WHERE build_channel = $1', [build_channel]);
  const forceUpdate = parseBuildFlag(force_update) === true;

  const result = await pool.query(
    `INSERT INTO app_builds
       (title, description, build_channel, file_type, version, version_code, file_key, file_url, file_size, is_latest, force_update)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)
     RETURNING *`,
    [
      title.trim(),
      description || null,
      build_channel,
      ext,
      version || null,
      version_code ? parseInt(version_code) : null,
      fileKey,
      fileUrl,
      file.size || null,
      forceUpdate,
    ]
  );
  return result.rows[0];
}

async function updateBuild(id, { title, description, build_channel, version, version_code, force_update, file }) {
  const existing = await pool.query('SELECT * FROM app_builds WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    if (file) await deleteBuildFile(file.key);
    return null;
  }
  const current = existing.rows[0];

  const nextChannel = build_channel || current.build_channel;
  const nextForceUpdate = parseBuildFlag(force_update);
  const forceUpdate = nextForceUpdate === null ? current.force_update : nextForceUpdate;

  if (!BUILD_CHANNELS.includes(nextChannel)) {
    if (file) await deleteBuildFile(file.key);
    const err = new Error('build_channel must be production, preview or development');
    err.statusCode = 400;
    throw err;
  }

  let fileKey = current.file_key;
  let fileUrl = current.file_url;
  let fileSize = current.file_size;
  let fileType = current.file_type;

  if (file) {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (!['apk', 'aab'].includes(ext)) {
      await deleteBuildFile(file.key);
      const err = new Error('Only .apk and .aab files are allowed');
      err.statusCode = 400;
      throw err;
    }
    await deleteBuildFile(current.file_key);
    fileKey = file.key;
    fileUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileKey}`;
    fileSize = file.size || null;
    fileType = ext;
  }

  const channelChanged = nextChannel !== current.build_channel;
  const result = await pool.query(
    `UPDATE app_builds SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       build_channel = $3,
       file_type = $4,
       version = COALESCE($5, version),
       version_code = COALESCE($6, version_code),
       file_key = $7,
       file_url = $8,
       file_size = $9,
       force_update = $10
     WHERE id = $11 RETURNING *`,
    [
      title?.trim() || null,
      description ?? null,
      nextChannel,
      fileType,
      version || null,
      version_code ? parseInt(version_code) : null,
      fileKey,
      fileUrl,
      fileSize,
      forceUpdate,
      id,
    ]
  );

  if (file || channelChanged) {
    await pool.query('UPDATE app_builds SET is_latest = FALSE WHERE build_channel = $1 AND id <> $2', [nextChannel, id]);
    await pool.query('UPDATE app_builds SET is_latest = TRUE WHERE id = $1', [id]);
    if (channelChanged && current.is_latest) {
      await promoteLatestBuild(current.build_channel);
    }
  }

  return result.rows[0];
}

async function deleteBuild(id) {
  const existing = await pool.query('SELECT * FROM app_builds WHERE id = $1', [id]);
  if (existing.rows.length === 0) return null;

  const build = existing.rows[0];
  await deleteBuildFile(build.file_key);
  await pool.query('DELETE FROM app_builds WHERE id = $1', [id]);

  if (build.is_latest) {
    await promoteLatestBuild(build.build_channel);
  }
  return { deleted: true, build };
}

// ─── Nutrition / Food Database ────────────────────────────────────────────────
async function listFoodItems({ page = 1, limit = 30, search, category }) {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];
  let pIdx = 1;

  if (search) {
    where.push(`food_name ILIKE $${pIdx}`);
    params.push(`%${search}%`);
    pIdx++;
  }
  if (category && category !== 'ALL') {
    where.push(`category = $${pIdx}`);
    params.push(category);
    pIdx++;
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM food_database ${whereClause}`, params);
  const dataRes = await pool.query(
    `SELECT id, food_name, category, meal_type, serving_size, calories_kcal, protein_g, carbohydrates_g, fat_g, fiber_g, image_url, source_file
     FROM food_database ${whereClause}
     ORDER BY id DESC
     LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  return { foods: dataRes.rows, total: countRes.rows[0]?.total || 0 };
}

async function createFoodItem(data) {
  const { food_name, category, serving_size, calories_kcal, protein_g, carbohydrates_g, fat_g, fiber_g } = data;
  const res = await pool.query(
    `INSERT INTO food_database (food_name, category, serving_size, calories_kcal, protein_g, carbohydrates_g, fat_g, fiber_g, source_file)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'admin_custom')
     RETURNING *`,
    [food_name, category || 'General', serving_size || '100g', calories_kcal || 0, protein_g || 0, carbohydrates_g || 0, fat_g || 0, fiber_g || 0]
  );
  return res.rows[0];
}

async function deleteFoodItem(id) {
  await pool.query('DELETE FROM food_database WHERE id = $1', [id]);
  return { success: true };
}

async function listLoggedMeals({ page = 1, limit = 30 }) {
  const offset = (page - 1) * limit;
  const countRes = await pool.query('SELECT COUNT(*)::int AS total FROM meals');
  const res = await pool.query(
    `SELECT m.id, m.user_id, u.full_name, u.email, u.profile_pic_url,
            m.meal_type,
            m.image_url AS photo_url,
            COALESCE(m.total_calories, 0)::numeric AS calories,
            COALESCE(m.total_protein, 0)::numeric AS protein,
            COALESCE(m.total_carbs, 0)::numeric AS carbs,
            COALESCE(m.total_fat, 0)::numeric AS fats,
            COALESCE(m.total_fiber, 0)::numeric AS fiber,
            COALESCE(m.created_at, m.logged_at, NOW()) AS created_at,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'id', mi.id,
                 'name', mi.item_name,
                 'quantity', mi.quantity,
                 'calories', mi.calories,
                 'protein', mi.protein,
                 'carbs', mi.carbs,
                 'fat', mi.fat
               ))
               FROM meal_items mi WHERE mi.meal_id = m.id),
              '[]'::json
            ) AS items
     FROM meals m
     LEFT JOIN users u ON m.user_id = u.id
     ORDER BY COALESCE(m.created_at, m.logged_at) DESC
     LIMIT $1 OFFSET $2`,
    [parseInt(limit), parseInt(offset)]
  );
  return { meals: res.rows, total: countRes.rows[0]?.total || 0 };
}

// ─── Physique Analyses ────────────────────────────────────────────────────────
async function listPhysiqueAnalyses({ page = 1, limit = 30, status }) {
  const offset = (page - 1) * limit;
  let where = '';
  const params = [];
  if (status && status !== 'ALL') {
    where = 'WHERE pa.status = $1';
    params.push(status);
  }
  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM physique_analyses pa ${where}`, params);
  const dataRes = await pool.query(
    `SELECT pa.id, pa.user_id, u.full_name, u.email, u.profile_pic_url,
            pa.photo_url, pa.overall_score, pa.body_fat_estimate, pa.muscle_symmetry,
            pa.posture_score, pa.strengths, pa.improvements, pa.muscle_groups,
            pa.coach_message, pa.status, pa.created_at
     FROM physique_analyses pa
     LEFT JOIN users u ON pa.user_id = u.id
     ${where}
     ORDER BY pa.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, parseInt(limit), parseInt(offset)]
  );
  return { items: dataRes.rows, total: countRes.rows[0]?.total || 0 };
}

async function updatePhysiqueStatus(id, status) {
  const res = await pool.query(
    'UPDATE physique_analyses SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return res.rows[0];
}

async function deletePhysiqueAnalysis(id) {
  await pool.query('DELETE FROM physique_analyses WHERE id = $1', [id]);
  return { success: true };
}

// ─── Workouts & Global PRs ────────────────────────────────────────────────────
async function listWorkoutSessionsAdmin({ page = 1, limit = 30 }) {
  const offset = (page - 1) * limit;
  const countRes = await pool.query('SELECT COUNT(*)::int AS total FROM daily_workouts');
  const res = await pool.query(
    `SELECT dw.id, dw.user_id, u.full_name, u.email, u.profile_pic_url,
            COALESCE(dw.started_at, dw.completed_at) AS scheduled_date,
            dw.status, dw.completed_at,
            COALESCE(dw.total_duration_seconds, 0) AS duration_seconds,
            COUNT(dwe.id)::int AS exercises_count,
            COALESCE(dw.total_volume, 0)::numeric AS total_volume_kg
     FROM daily_workouts dw
     LEFT JOIN users u ON dw.user_id = u.id
     LEFT JOIN daily_workout_exercises dwe ON dw.id = dwe.daily_workout_id
     GROUP BY dw.id, u.full_name, u.email, u.profile_pic_url
     ORDER BY dw.completed_at DESC NULLS LAST, dw.id DESC
     LIMIT $1 OFFSET $2`,
    [parseInt(limit), parseInt(offset)]
  );

  const prsRes = await pool.query(
    `SELECT gpr.exercise_id, e.name AS exercise_name, gpr.user_id, u.full_name, u.email, u.profile_pic_url,
            COALESCE(gpr.source_weight, gpr.metric_value, 0)::numeric AS weight_kg,
            COALESCE(gpr.source_reps, 1)::int AS reps,
            gpr.achieved_at
     FROM global_exercise_prs gpr
     JOIN exercises e ON gpr.exercise_id = e.id
     JOIN users u ON gpr.user_id = u.id
     ORDER BY COALESCE(gpr.source_weight, gpr.metric_value, 0) DESC NULLS LAST
     LIMIT 10`
  );

  return { sessions: res.rows, total: countRes.rows[0]?.total || 0, globalPrs: prsRes.rows };
}

// ─── Notifications Broadcast Log ──────────────────────────────────────────────
async function listNotificationHistory({ page = 1, limit = 30 }) {
  const offset = (page - 1) * limit;
  const countRes = await pool.query("SELECT COUNT(*)::int AS total FROM notifications");
  const res = await pool.query(
    `SELECT n.id,
            COALESCE(n.type, 'Broadcast') AS title,
            COALESCE(n.message, '') AS body,
            NULL AS data,
            n.created_at,
            1::int AS recipients_count
     FROM notifications n
     ORDER BY n.created_at DESC
     LIMIT $1 OFFSET $2`,
    [parseInt(limit), parseInt(offset)]
  );
  return { campaigns: res.rows, total: countRes.rows[0]?.total || 0 };
}

// ─── Phase 2: Onboarding & Habits Analytics ──────────────────────────────────
async function getOnboardingAnalytics() {
  const totalUsersRes = await pool.query('SELECT COUNT(*)::int AS total FROM users');
  const completedRes = await pool.query('SELECT COUNT(*)::int AS completed FROM users WHERE onboarding_completed = TRUE');

  const goalsRes = await pool.query(
    `SELECT COALESCE(fitness_goal, 'General Fitness') AS goal, COUNT(*)::int AS count
     FROM users
     GROUP BY fitness_goal
     ORDER BY count DESC`
  );

  const expRes = await pool.query(
    `SELECT COALESCE(experience_level, 'Beginner') AS level, COUNT(*)::int AS count
     FROM users
     GROUP BY experience_level
     ORDER BY count DESC`
  );

  const genderRes = await pool.query(
    `SELECT COALESCE(gender, 'Unspecified') AS gender, COUNT(*)::int AS count
     FROM users
     GROUP BY gender
     ORDER BY count DESC`
  );

  const dietRes = await pool.query(
    `SELECT COALESCE(diet_type, 'Standard') AS diet, COUNT(*)::int AS count
     FROM users
     GROUP BY diet_type
     ORDER BY count DESC`
  );

  const total = totalUsersRes.rows[0]?.total || 1;
  const completed = completedRes.rows[0]?.completed || 0;

  const stepStats = await pool.query(`
    SELECT
      COUNT(*)::int AS total_registered,
      COUNT(*) FILTER (WHERE gender IS NOT NULL)::int AS step_gender,
      COUNT(*) FILTER (WHERE dob IS NOT NULL)::int AS step_dob,
      COUNT(*) FILTER (WHERE height IS NOT NULL AND weight IS NOT NULL)::int AS step_measurements,
      COUNT(*) FILTER (WHERE fitness_goal IS NOT NULL)::int AS step_goals,
      COUNT(*) FILTER (WHERE experience_level IS NOT NULL)::int AS step_experience,
      COUNT(*) FILTER (WHERE diet_type IS NOT NULL)::int AS step_diet,
      COUNT(*) FILTER (WHERE onboarding_completed = TRUE)::int AS step_completed
    FROM users
  `);

  const s = stepStats.rows[0] || {};
  const funnelSteps = [
    { step: 1, name: "Account Created", count: s.total_registered || total, pct: 100 },
    { step: 2, name: "Gender Selection", count: s.step_gender || 0, pct: Math.round(((s.step_gender || 0) / total) * 100) },
    { step: 3, name: "Date of Birth", count: s.step_dob || 0, pct: Math.round(((s.step_dob || 0) / total) * 100) },
    { step: 4, name: "Body Height & Weight", count: s.step_measurements || 0, pct: Math.round(((s.step_measurements || 0) / total) * 100) },
    { step: 5, name: "Primary Fitness Goal", count: s.step_goals || 0, pct: Math.round(((s.step_goals || 0) / total) * 100) },
    { step: 6, name: "Gym Experience Level", count: s.step_experience || 0, pct: Math.round(((s.step_experience || 0) / total) * 100) },
    { step: 7, name: "Dietary Preferences", count: s.step_diet || 0, pct: Math.round(((s.step_diet || 0) / total) * 100) },
    { step: 8, name: "Onboarding Finalized", count: s.step_completed || completed, pct: Math.round(((s.step_completed || completed) / total) * 100) },
  ];

  return {
    totalUsers: total,
    completedOnboarding: completed,
    completionRate: Math.round((completed / total) * 100),
    funnel: funnelSteps,
    goals: goalsRes.rows,
    experience: expRes.rows,
    gender: genderRes.rows,
    diet: dietRes.rows,
  };
}

async function getHabitsAnalytics() {
  const todayWorkouts = await pool.query(
    "SELECT COUNT(*)::int AS count FROM daily_workouts WHERE DATE(COALESCE(started_at, completed_at)) = CURRENT_DATE"
  );
  const todayMeals = await pool.query(
    "SELECT COUNT(*)::int AS count FROM meals WHERE DATE(COALESCE(created_at, logged_at)) = CURRENT_DATE"
  );
  const todayWater = await pool.query(
    "SELECT COUNT(*)::int AS count FROM water_logs WHERE DATE(logged_at) = CURRENT_DATE"
  );

  const dayOfWeekRes = await pool.query(`
    SELECT
      TO_CHAR(completed_at, 'Dy') AS day_name,
      EXTRACT(DOW FROM completed_at)::int AS day_num,
      COUNT(*)::int AS count
    FROM daily_workouts
    WHERE completed_at >= NOW() - INTERVAL '30 days'
    GROUP BY day_name, day_num
    ORDER BY day_num
  `);

  return {
    today: {
      workouts: todayWorkouts.rows[0]?.count || 0,
      meals: todayMeals.rows[0]?.count || 0,
      water: todayWater.rows[0]?.count || 0,
    },
    dayOfWeekActivity: dayOfWeekRes.rows,
  };
}

async function getUser360Profile(userId) {
  const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!userRes.rows.length) return null;
  const user = userRes.rows[0];

  const workoutsRes = await pool.query(
    `SELECT dw.id,
            COALESCE(dw.started_at, dw.completed_at) AS scheduled_date,
            dw.status, dw.completed_at,
            COALESCE(dw.total_duration_seconds, 0) AS duration_seconds,
            COUNT(dwe.id)::int AS exercises_count,
            COALESCE(dw.total_volume, 0)::numeric AS total_volume_kg
     FROM daily_workouts dw
     LEFT JOIN daily_workout_exercises dwe ON dw.id = dwe.daily_workout_id
     WHERE dw.user_id = $1
     GROUP BY dw.id
     ORDER BY dw.completed_at DESC NULLS LAST, dw.id DESC
     LIMIT 10`,
    [userId]
  );

  const mealsRes = await pool.query(
    `SELECT m.id, m.meal_type,
            m.image_url AS photo_url,
            COALESCE(m.total_calories, 0)::numeric AS calories,
            COALESCE(m.total_protein, 0)::numeric AS protein,
            COALESCE(m.total_carbs, 0)::numeric AS carbs,
            COALESCE(m.total_fat, 0)::numeric AS fats,
            COALESCE(m.total_fiber, 0)::numeric AS fiber,
            COALESCE(m.created_at, m.logged_at, NOW()) AS created_at,
            COALESCE(
              (SELECT json_agg(json_build_object(
                 'id', mi.id,
                 'name', mi.item_name,
                 'quantity', mi.quantity,
                 'calories', mi.calories,
                 'protein', mi.protein,
                 'carbs', mi.carbs,
                 'fat', mi.fat
               ))
               FROM meal_items mi WHERE mi.meal_id = m.id),
              '[]'::json
            ) AS items
     FROM meals m
     WHERE m.user_id = $1
     ORDER BY COALESCE(m.created_at, m.logged_at) DESC
     LIMIT 10`,
    [userId]
  );

  const weightsRes = await pool.query(
    `SELECT id, weight AS weight_kg, logged_at AS logged_date, logged_at AS created_at
     FROM weight_logs
     WHERE user_id = $1
     ORDER BY logged_at DESC
     LIMIT 15`,
    [userId]
  );

  const physiqueRes = await pool.query(
    `SELECT id, photo_url, overall_score, body_fat_estimate, status, created_at
     FROM physique_analyses
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 6`,
    [userId]
  );

  return {
    user,
    workouts: workoutsRes.rows,
    meals: mealsRes.rows,
    weights: weightsRes.rows,
    physique: physiqueRes.rows,
  };
}

// ─── Phase 3: AI Intelligence, Remote Config & Gamification ──────────────────

async function getAiIntelligenceAnalytics({ sessionPage = 1, sessionLimit = 15, reportPage = 1, reportLimit = 10 } = {}) {
  const [sessionsCount, messagesCount, reportsCount, physiqueCount] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM ai_sessions'),
    pool.query('SELECT COUNT(*)::int AS count FROM ai_messages'),
    pool.query('SELECT COUNT(*)::int AS count FROM workout_reports'),
    pool.query('SELECT COUNT(*)::int AS count FROM physique_analyses'),
  ]);

  const totalSessions = sessionsCount.rows[0]?.count || 0;
  const totalMessages = messagesCount.rows[0]?.count || 0;
  const totalReports = reportsCount.rows[0]?.count || 0;
  const totalPhysique = physiqueCount.rows[0]?.count || 0;

  const sessionOffset = Math.max(0, (parseInt(sessionPage) - 1) * parseInt(sessionLimit));
  const reportOffset = Math.max(0, (parseInt(reportPage) - 1) * parseInt(reportLimit));

  // Paginated AI Sessions
  const recentSessions = await pool.query(`
    SELECT s.id, s.user_id, u.full_name, u.email, u.profile_pic_url,
           s.title, s.created_at, s.updated_at,
           COUNT(m.id)::int AS message_count
    FROM ai_sessions s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN ai_messages m ON s.id = m.session_id
    GROUP BY s.id, u.full_name, u.email, u.profile_pic_url
    ORDER BY s.updated_at DESC
    LIMIT $1 OFFSET $2
  `, [parseInt(sessionLimit), parseInt(sessionOffset)]);

  // Paginated AI Workout Reports
  const recentReports = await pool.query(`
    SELECT wr.id, wr.user_id, u.full_name, u.email, u.profile_pic_url,
           wr.daily_workout_id, wr.summary, wr.good_things, wr.areas_to_improve,
           wr.recommendations, wr.progress_pct, wr.current_phase, wr.created_at
    FROM workout_reports wr
    LEFT JOIN users u ON wr.user_id = u.id
    ORDER BY wr.created_at DESC
    LIMIT $1 OFFSET $2
  `, [parseInt(reportLimit), parseInt(reportOffset)]);

  // Multi-Provider Model Catalog with full Context Window & Pricing Telemetry
  const modelsCatalog = [
    {
      provider: 'Google Gemini',
      model: 'gemini-2.0-flash',
      tier: 'Multimodal Vision & Physique',
      context_tokens_in: 1048576, // 1M tokens in
      max_tokens_out: 8192,
      input_cost_per_m: 0.10, // $0.10 / 1M tokens
      output_cost_per_m: 0.40, // $0.40 / 1M tokens
      cached_cost_per_m: 0.025,
      speed_tps: 185,
      rpm: 15,
      rpd: 1500,
      status: 'Active (Vision)',
    },
    {
      provider: 'Google Gemini',
      model: 'gemini-1.5-flash',
      tier: 'Coach Chat & Workout Reasoning',
      context_tokens_in: 1048576, // 1M tokens in
      max_tokens_out: 8192,
      input_cost_per_m: 0.075, // $0.075 / 1M tokens
      output_cost_per_m: 0.30, // $0.30 / 1M tokens
      cached_cost_per_m: 0.01875,
      speed_tps: 160,
      rpm: 15,
      rpd: 1500,
      status: 'Active (Chat)',
    },
    {
      provider: 'Groq LPU',
      model: 'llama-3.3-70b-versatile',
      tier: 'Real-time In-Set Assistant',
      context_tokens_in: 131072, // 128k tokens in
      max_tokens_out: 8192,
      input_cost_per_m: 0.59, // $0.59 / 1M tokens
      output_cost_per_m: 0.79, // $0.79 / 1M tokens
      cached_cost_per_m: 0.00,
      speed_tps: 280,
      rpm: 30,
      rpd: 14400,
      status: 'Active (Ultra-Fast)',
    },
    {
      provider: 'OpenRouter',
      model: 'qwen/qwen-2.5-72b-instruct:free',
      tier: 'Zero-Cost Fallback Tier',
      context_tokens_in: 32768, // 32k tokens in
      max_tokens_out: 4096,
      input_cost_per_m: 0.00,
      output_cost_per_m: 0.00,
      cached_cost_per_m: 0.00,
      speed_tps: 75,
      rpm: 20,
      rpd: 1000,
      status: 'Active (Fallback)',
    },
    {
      provider: 'OpenRouter',
      model: 'mistralai/mistral-small-24b-instruct:free',
      tier: 'Cold Standby Redundancy',
      context_tokens_in: 32768, // 32k tokens in
      max_tokens_out: 4096,
      input_cost_per_m: 0.00,
      output_cost_per_m: 0.00,
      cached_cost_per_m: 0.00,
      speed_tps: 85,
      rpm: 20,
      rpd: 1000,
      status: 'Standby',
    },
  ];

  // Live Token & Context Telemetry Calculations
  const avgPromptTokensIn = 1420;
  const avgCompletionTokensOut = 385;
  const estimatedTokensIn = Math.round((totalMessages * avgPromptTokensIn) + (totalReports * 2600) + (totalPhysique * 1600));
  const estimatedTokensOut = Math.round((totalMessages * avgCompletionTokensOut) + (totalReports * 620) + (totalPhysique * 450));
  const totalTokensBurned = estimatedTokensIn + estimatedTokensOut;

  // Blended realistic cost calculation ($0.085/1M in, $0.34/1M out)
  const estimatedCost = (estimatedTokensIn * 0.000000085) + (estimatedTokensOut * 0.00000034);

  return {
    metrics: {
      totalSessions,
      totalMessages,
      workoutReportsCount: totalReports,
      physiqueAssessmentsCount: totalPhysique,
      estimatedTokensIn,
      estimatedTokensOut,
      totalTokensBurned,
      avgPromptTokensIn,
      avgCompletionTokensOut,
      estimatedTokenCostUsd: Number(estimatedCost.toFixed(3)),
    },
    models: modelsCatalog,
    sessions: recentSessions.rows,
    sessionsPagination: {
      page: parseInt(sessionPage),
      limit: parseInt(sessionLimit),
      total: totalSessions,
      totalPages: Math.max(1, Math.ceil(totalSessions / parseInt(sessionLimit))),
    },
    reports: recentReports.rows,
    reportsPagination: {
      page: parseInt(reportPage),
      limit: parseInt(reportLimit),
      total: totalReports,
      totalPages: Math.max(1, Math.ceil(totalReports / parseInt(reportLimit))),
    },
  };
}

async function getAiSessionMessages(sessionId) {
  const sessionRes = await pool.query(`
    SELECT s.id, s.user_id, u.full_name, u.email, u.profile_pic_url, s.title, s.created_at, s.updated_at
    FROM ai_sessions s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = $1
  `, [sessionId]);

  if (!sessionRes.rows.length) return null;

  const messagesRes = await pool.query(`
    SELECT id, role, content, actions, created_at
    FROM ai_messages
    WHERE session_id = $1
    ORDER BY created_at ASC
  `, [sessionId]);

  return {
    session: sessionRes.rows[0],
    messages: messagesRes.rows,
  };
}

const DEFAULT_REMOTE_CONFIG = {
  feature_flags: {
    ai_coach_enabled: true,
    ai_meal_scanner_enabled: true,
    physique_analysis_enabled: true,
    community_leaderboard_enabled: true,
    water_hydration_tracker_enabled: true,
    strict_maintenance_mode: false,
  },
  app_version_policy: {
    min_supported_ios_version: '1.0.0',
    min_supported_android_version: '1.0.0',
    latest_ios_build: '1.2.4',
    latest_android_build: '1.2.4',
    force_update_prompt: false,
  },
  maintenance_window: {
    headline: 'Under Scheduled Maintenance',
    message: 'SpotMe is performing routine maintenance. Services will resume shortly.',
    scheduled_end: null,
  },
  cache_settings: {
    client_telemetry_interval_sec: 30,
    leaderboard_cache_ttl_sec: 300,
  },
};

async function getRemoteConfig() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_remote_config (
      key VARCHAR(64) PRIMARY KEY,
      value JSONB,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  const res = await pool.query('SELECT value, updated_at FROM system_remote_config WHERE key = $1', ['main']);
  if (res.rows.length && res.rows[0].value) {
    return {
      config: res.rows[0].value,
      updated_at: res.rows[0].updated_at,
    };
  }

  // Seed default if empty
  await pool.query(
    'INSERT INTO system_remote_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
    ['main', JSON.stringify(DEFAULT_REMOTE_CONFIG)]
  );

  return {
    config: DEFAULT_REMOTE_CONFIG,
    updated_at: new Date().toISOString(),
  };
}

async function updateRemoteConfig(newConfig) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_remote_config (
      key VARCHAR(64) PRIMARY KEY,
      value JSONB,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  const res = await pool.query(`
    INSERT INTO system_remote_config (key, value, updated_at)
    VALUES ('main', $1, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW()
    RETURNING value, updated_at
  `, [JSON.stringify(newConfig)]);

  return {
    success: true,
    config: res.rows[0].value,
    updated_at: res.rows[0].updated_at,
  };
}

async function getGamificationAnalytics({ page = 1, limit = 20 } = {}) {
  const [totalXpRes, todayXpRes, txCountRes] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(amount), 0)::int AS total_xp FROM xp_transactions'),
    pool.query('SELECT COALESCE(SUM(amount), 0)::int AS today_xp FROM xp_transactions WHERE DATE(created_at) = CURRENT_DATE'),
    pool.query('SELECT COUNT(*)::int AS count FROM xp_transactions'),
  ]);

  const totalTx = txCountRes.rows[0]?.count || 0;
  const offset = Math.max(0, (parseInt(page) - 1) * parseInt(limit));

  const reasonsRes = await pool.query(`
    SELECT COALESCE(reason, 'General Workout XP') AS reason,
           COUNT(*)::int AS count,
           SUM(amount)::int AS total_awarded
    FROM xp_transactions
    GROUP BY reason
    ORDER BY total_awarded DESC
    LIMIT 8
  `);

  const tiersRes = await pool.query(`
    SELECT COALESCE(league_tier, 'Iron') AS tier,
           COUNT(*)::int AS count
    FROM users
    GROUP BY league_tier
    ORDER BY count DESC
  `);

  const leaderboardRes = await pool.query(`
    SELECT id, full_name, email, profile_pic_url,
           COALESCE(total_xp, 0)::int AS total_xp,
           COALESCE(league_tier, 'Iron') AS league_tier,
           COALESCE(current_streak, 0)::int AS current_streak
    FROM users
    ORDER BY total_xp DESC NULLS LAST
    LIMIT 10
  `);

  const recentTxRes = await pool.query(`
    SELECT xt.id, xt.user_id, u.full_name, u.email, u.profile_pic_url,
           xt.amount, xt.reason, xt.created_at
    FROM xp_transactions xt
    LEFT JOIN users u ON xt.user_id = u.id
    ORDER BY xt.created_at DESC
    LIMIT $1 OFFSET $2
  `, [parseInt(limit), parseInt(offset)]);

  return {
    metrics: {
      totalXpAwarded: totalXpRes.rows[0]?.total_xp || 0,
      todayXpAwarded: todayXpRes.rows[0]?.today_xp || 0,
      transactionsCount: totalTx,
    },
    reasons: reasonsRes.rows,
    tiers: tiersRes.rows,
    leaderboard: leaderboardRes.rows,
    recentTransactions: recentTxRes.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalTx,
      totalPages: Math.max(1, Math.ceil(totalTx / parseInt(limit))),
    },
  };
}

module.exports = {
  getEntityImageUrls,
  BUILD_CHANNELS,
  parseBuildFlag,
  adminLogin,
  getAdminMe,
  getDashboardStats,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  listFeedback,
  deleteFeedback,
  getActiveUsers,
  createExercise,
  updateExercise,
  listSplits,
  getSplitById,
  createSplit,
  updateSplit,
  deleteSplit,
  listEntities,
  getEntityById,
  createEntity,
  updateEntity,
  deleteEntity,
  listBuilds,
  getBuildById,
  createBuild,
  updateBuild,
  deleteBuild,
  deleteBuildFile,
  listFoodItems,
  createFoodItem,
  deleteFoodItem,
  listLoggedMeals,
  listPhysiqueAnalyses,
  updatePhysiqueStatus,
  deletePhysiqueAnalysis,
  listWorkoutSessionsAdmin,
  listNotificationHistory,
  getOnboardingAnalytics,
  getHabitsAnalytics,
  getUser360Profile,
  getAiIntelligenceAnalytics,
  getAiSessionMessages,
  getRemoteConfig,
  updateRemoteConfig,
  getGamificationAnalytics,
};
