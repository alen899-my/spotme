const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const authenticateAdmin = require('../middleware/adminAuth');
const upload = require('../uploadConfig');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();

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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const result = await pool.query(
      'SELECT id, full_name AS name, email, password FROM users WHERE email = $1 AND role = $2',
      [email, 'admin']
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name AS name, email, created_at FROM users WHERE id = $1',
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Admin me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const [users, workouts, meals, activeUsers, waterLogs, activeWorkouts] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query("SELECT COUNT(*)::int AS count FROM daily_workouts WHERE status = 'completed'"),
      pool.query('SELECT COUNT(*)::int AS count FROM meals'),
      pool.query("SELECT COUNT(*)::int AS count FROM daily_workouts WHERE completed_at > NOW() - INTERVAL '7 days'"),
      pool.query('SELECT COUNT(*)::int AS count FROM water_logs'),
      pool.query("SELECT COUNT(*)::int AS count FROM daily_workouts WHERE status = 'active'"),
    ]);

    res.json({
      totalUsers: users.rows[0].count,
      totalWorkouts: workouts.rows[0].count,
      totalMeals: meals.rows[0].count,
      activeUsers: activeUsers.rows[0].count,
      totalWaterLogs: waterLogs.rows[0].count,
      activeWorkoutsNow: activeWorkouts.rows[0].count,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── User CRUD ──────────────────────────────────────────────────────────────

router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sortBy, sortOrder } = req.query;
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

    res.json({ users: dataResult.rows, total: countResult.rows[0].total });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users/:id', authenticateAdmin, async (req, res) => {
  try {
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
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const stats = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM daily_workouts WHERE user_id = $1 AND status = 'completed'", [req.params.id]),
      pool.query('SELECT COUNT(*)::int AS count FROM meals WHERE user_id = $1', [req.params.id]),
      pool.query('SELECT COUNT(*)::int AS count FROM water_logs WHERE user_id = $1', [req.params.id]),
      pool.query("SELECT MAX(completed_at) AS last_active FROM daily_workouts WHERE user_id = $1 AND status = 'completed'", [req.params.id]),
    ]);

    const user = result.rows[0];
    user.totalWorkouts = stats[0].rows[0].count;
    user.totalMeals = stats[1].rows[0].count;
    user.totalWaterLogs = stats[2].rows[0].count;
    user.lastActiveAt = stats[3].rows[0].last_active || user.joinedAt;

    res.json(user);
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { name, email, role, status, plan, phone } = req.body;
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
      [name, email, role, status, plan, phone, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Feedback CRUD ──────────────────────────────────────────────────────────

router.get('/feedback', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sortBy, sortOrder } = req.query;
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
              u.full_name AS "userName", u.email AS "userEmail"
       FROM feedback f
       LEFT JOIN users u ON f.user_id = u.id
       ${whereClause}
       ORDER BY ${col} ${dir}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ feedbacks: dataResult.rows, total: countResult.rows[0].total });
  } catch (error) {
    console.error('Admin list feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/feedback/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM feedback WHERE id = $1 RETURNING id', [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted' });
  } catch (error) {
    console.error('Admin delete feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Active Users ──────────────────────────────────────────────────────────

router.get('/active-users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    // Online now (active in last 5 min)
    const onlineRes = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE last_active_at > NOW() - INTERVAL '5 minutes'
    `);

    // Active today
    const todayRes = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE last_active_at >= CURRENT_DATE
    `);

    // Active this week
    const weekRes = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE last_active_at >= DATE_TRUNC('week', CURRENT_DATE)
    `);

    // Daily stats (past 30 days)
    const dailyRes = await pool.query(`
      SELECT DATE(last_active_at) AS date, COUNT(DISTINCT id) AS count
      FROM users
      WHERE last_active_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(last_active_at)
      ORDER BY date DESC
    `);

    // Paginated user list with last_active_at
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
      `SELECT u.id, u.full_name AS name, u.email, u.status,
              u.last_active_at, u.created_at,
              (SELECT COUNT(*)::int FROM daily_workouts WHERE user_id = u.id AND status = 'completed') AS total_workouts
       FROM users u ${whereClause}
       ORDER BY u.last_active_at DESC NULLS LAST
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      online: onlineRes.rows[0].count,
      activeToday: todayRes.rows[0].count,
      activeWeek: weekRes.rows[0].count,
      dailyStats: dailyRes.rows,
      users: usersRes.rows,
      total: countRes.rows[0].total,
    });
  } catch (error) {
    console.error('Admin active users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Exercise CRUD ─────────────────────────────────────────────────────────

router.post('/exercises', authenticateAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gif', maxCount: 1 },
]), validate(schemas.createExercise), async (req, res) => {
  try {
    const {
      name, category, body_part, equipment, target,
      muscle_group, secondary_muscles, instructions_en,
    } = req.body;

    const maxResult = await pool.query('SELECT MAX(CAST(id AS INTEGER)) AS max_id FROM exercises');
    const nextId = String((maxResult.rows[0].max_id || 0) + 1).padStart(4, '0');

    const getFileUrl = (fieldname) => {
      if (req.files?.[fieldname]?.[0]) {
        return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${req.files[fieldname][0].key}`;
      }
      return null;
    };

    const imageUrl = getFileUrl('image');
    const gifUrl = getFileUrl('gif');

    const secondaryArray = secondary_muscles
      ? secondary_muscles.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const entityImages = await getEntityImageUrls({
      category, body_part, equipment, target, muscle_group,
    });

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
       entityImages.muscle_group_image_url,]
    );

    res.status(201).json({ success: true, exercise: result.rows[0] });
  } catch (error) {
    console.error('Admin create exercise error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/exercises/:id', authenticateAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gif', maxCount: 1 },
]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, category, body_part, equipment, target,
      muscle_group, secondary_muscles, instructions_en,
    } = req.body;

    const existing = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    const getFileUrl = (fieldname) => {
      if (req.files?.[fieldname]?.[0]) {
        return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${req.files[fieldname][0].key}`;
      }
      return null;
    };

    const imageUrl = req.body.remove_image === '1'
      ? null
      : (getFileUrl('image') || existing.rows[0].image_url);
    const gifUrl = req.body.remove_gif === '1'
      ? null
      : (getFileUrl('gif') || existing.rows[0].gif_url);

    const secondaryArray = secondary_muscles
      ? secondary_muscles.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const entityImages = await getEntityImageUrls({
      category, body_part, equipment, target, muscle_group,
    });

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

    res.json({ success: true, exercise: result.rows[0] });
  } catch (error) {
    console.error('Admin update exercise error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Workout Split CRUD (admin templates, no user_id) ──────────────────────

// GET /admin/splits – list template splits
router.get('/splits', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sortBy, sortOrder } = req.query;
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

    res.json({ splits: dataResult.rows, total: countResult.rows[0].total });
  } catch (error) {
    console.error('Admin list splits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /admin/splits/:id – single split with sessions + exercises
router.get('/splits/:id', authenticateAdmin, async (req, res) => {
  try {
    const splitRes = await pool.query(
      'SELECT * FROM workout_splits WHERE id = $1 AND is_template = true', [req.params.id]
    );
    if (splitRes.rows.length === 0) {
      return res.status(404).json({ message: 'Split not found' });
    }

    const sessionsRes = await pool.query(
      'SELECT * FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order ASC', [req.params.id]
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

    res.json({ ...splitRes.rows[0], sessions });
  } catch (error) {
    console.error('Admin get split error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /admin/splits – create split with sessions + exercises (bulk)
router.post('/splits', authenticateAdmin, async (req, res) => {
  const { name, description, sessions } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name is required' });
  }

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

    // Return full split with sessions
    const fullRes = await pool.query(
      'SELECT * FROM workout_splits WHERE id = $1', [split.id]
    );
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
    const sessions = sessionsRes.rows.map(sess => ({
      ...sess,
      exercises: exercises.filter(e => e.session_id === sess.id),
    }));

    res.status(201).json({ ...fullRes.rows[0], sessions });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Admin create split error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /admin/splits/:id – replace split + sessions + exercises
router.put('/splits/:id', authenticateAdmin, async (req, res) => {
  const { name, description, sessions } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM workout_splits WHERE id = $1 AND is_template = true', [req.params.id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Split not found' });
    }

    await client.query(
      'UPDATE workout_splits SET name = $1, description = $2 WHERE id = $3',
      [name || null, description || null, req.params.id]
    );

    // Delete existing sessions (cascades to exercises)
    await client.query('DELETE FROM workout_sessions WHERE split_id = $1', [req.params.id]);

    if (Array.isArray(sessions)) {
      for (let i = 0; i < sessions.length; i++) {
        const sess = sessions[i];
        const sessRes = await client.query(
          'INSERT INTO workout_sessions (split_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
          [req.params.id, sess.name || `Day ${i + 1}`, i]
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

    const fullRes = await pool.query(
      'SELECT * FROM workout_splits WHERE id = $1', [req.params.id]
    );
    const sessionsRes = await pool.query(
      'SELECT * FROM workout_sessions WHERE split_id = $1 ORDER BY sort_order', [req.params.id]
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
    const sessions = sessionsRes.rows.map(sess => ({
      ...sess,
      exercises: exercises.filter(e => e.session_id === sess.id),
    }));

    res.json({ ...fullRes.rows[0], sessions });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Admin update split error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /admin/splits/:id
router.delete('/splits/:id', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM workout_splits WHERE id = $1 AND is_template = true RETURNING id', [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Split not found' });
    }
    res.json({ message: 'Split deleted' });
  } catch (error) {
    console.error('Admin delete split error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Entity Library CRUD ───────────────────────────────────────────────────
// Generic CRUD factory for library tables (categories, body_parts, etc.)
const entityTables = [
  'categories', 'body_parts', 'equipment', 'targets', 'muscle_groups', 'secondary_muscles',
];

// Mapping from entity table to exercises column for image cascade
const exerciseCascadeMap = {
  categories: { col: 'category', imgCol: 'category_image_url' },
  body_parts: { col: 'body_part', imgCol: 'body_part_image_url' },
  equipment:  { col: 'equipment',  imgCol: 'equipment_image_url' },
  targets:    { col: 'target',     imgCol: 'target_image_url' },
  muscle_groups: { col: 'muscle_group', imgCol: 'muscle_group_image_url' },
};

function createEntityRoutes(table, entityName) {
  const listName = entityName.replace(/-/g, '_');

  // GET /admin/:entity – list
  router.get(`/${entityName}`, authenticateAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 50, search, sortBy, sortOrder } = req.query;
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

      res.json({ [listName]: dataResult.rows, total: countResult.rows[0].total });
    } catch (error) {
      console.error(`Admin list ${entityName} error:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // GET /admin/:entity/:id – single item
  router.get(`/${entityName}/:id`, authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: `${entityName} not found` });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error(`Admin get ${entityName} error:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // POST /admin/:entity – create with optional image
  router.post(`/${entityName}`, authenticateAdmin, upload.single('image'), async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: 'Name is required' });

      const imageUrl = req.file
        ? `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${req.file.key}`
        : null;

      const result = await pool.query(
        `INSERT INTO ${table} (name, image_url) VALUES ($1, $2) RETURNING *`,
        [name, imageUrl]
      );

      res.status(201).json({ success: true, [entityName]: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: `${entityName} already exists` });
      }
      console.error(`Admin create ${entityName} error:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // PUT /admin/:entity/:id – update name and/or image
  router.put(`/${entityName}/:id`, authenticateAdmin, upload.single('image'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const existing = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ message: `${entityName} not found` });
      }

      const imageUrl = req.file
        ? `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${req.file.key}`
        : (req.body.remove_image === '1' ? null : existing.rows[0].image_url);

      const result = await pool.query(
        `UPDATE ${table} SET name = COALESCE($1, name), image_url = $2 WHERE id = $3 RETURNING *`,
        [name || null, imageUrl, id]
      );

      // Cascade image to all exercises referencing this entity
      const cascade = exerciseCascadeMap[table];
      if (cascade && existing.rows[0].name) {
        await pool.query(
          `UPDATE exercises SET ${cascade.imgCol} = $1 WHERE ${cascade.col} = $2`,
          [imageUrl, existing.rows[0].name]
        );
      }

      res.json({ success: true, [entityName]: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: `${entityName} name already exists` });
      }
      console.error(`Admin update ${entityName} error:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // DELETE /admin/:entity/:id
  router.delete(`/${entityName}/:id`, authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `DELETE FROM ${table} WHERE id = $1 RETURNING id`, [req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: `${entityName} not found` });
      }
      res.json({ message: `${entityName} deleted` });
    } catch (error) {
      console.error(`Admin delete ${entityName} error:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  });
}

const entityNameMap = {
  categories: 'categories',
  body_parts: 'body-parts',
  equipment: 'equipment',
  targets: 'targets',
  muscle_groups: 'muscle-groups',
  secondary_muscles: 'secondary-muscles',
};

for (const [table, entityName] of Object.entries(entityNameMap)) {
  createEntityRoutes(table, entityName);
}

module.exports = router;