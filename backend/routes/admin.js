const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const authenticateAdmin = require('../middleware/adminAuth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
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
      'SELECT id, email, name, created_at FROM admins WHERE id = $1',
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

module.exports = router;