const express = require('express');
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// GET /api/gym — Return the gym owned by the logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM gyms WHERE owner_id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No gym registered' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('GET /api/gym error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/gym/register — Create a new gym for the logged-in user
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      tagline,
      address,
      city,
      state,
      country,
      capacity,
      member_count,
      gym_type,
      opening_time,
      closing_time,
      open_days,
      phone,
      website,
      contact_email,
    } = req.body;

    if (!name || !city || !country) {
      return res.status(400).json({ message: 'Name, city, and country are required.' });
    }

    // Prevent duplicate gym registrations for the same owner
    const existing = await pool.query('SELECT id FROM gyms WHERE owner_id = $1', [req.user.id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'You already have a registered gym.' });
    }

    const result = await pool.query(
      `INSERT INTO gyms
        (owner_id, name, tagline, address, city, state, country, capacity, member_count,
         gym_type, opening_time, closing_time, open_days, phone, website, contact_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        req.user.id,
        name,
        tagline || null,
        address || null,
        city,
        state || null,
        country,
        capacity ? parseInt(capacity) : 0,
        member_count ? parseInt(member_count) : 0,
        gym_type || 'Commercial',
        opening_time || '06:00',
        closing_time || '22:00',
        JSON.stringify(open_days || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']),
        phone || null,
        website || null,
        contact_email || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/gym/register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/gym — Update existing gym
router.put('/', authenticateToken, async (req, res) => {
  try {
    const {
      name, tagline, address, city, state, country,
      capacity, member_count, gym_type, opening_time, closing_time,
      open_days, phone, website, contact_email,
    } = req.body;

    const result = await pool.query(
      `UPDATE gyms SET
        name = COALESCE($1, name),
        tagline = COALESCE($2, tagline),
        address = COALESCE($3, address),
        city = COALESCE($4, city),
        state = COALESCE($5, state),
        country = COALESCE($6, country),
        capacity = COALESCE($7, capacity),
        member_count = COALESCE($8, member_count),
        gym_type = COALESCE($9, gym_type),
        opening_time = COALESCE($10, opening_time),
        closing_time = COALESCE($11, closing_time),
        open_days = COALESCE($12, open_days),
        phone = COALESCE($13, phone),
        website = COALESCE($14, website),
        contact_email = COALESCE($15, contact_email),
        updated_at = NOW()
       WHERE owner_id = $16
       RETURNING *`,
      [
        name || null,
        tagline || null,
        address || null,
        city || null,
        state || null,
        country || null,
        capacity !== undefined ? parseInt(capacity) : null,
        member_count !== undefined ? parseInt(member_count) : null,
        gym_type || null,
        opening_time || null,
        closing_time || null,
        open_days ? JSON.stringify(open_days) : null,
        phone || null,
        website || null,
        contact_email || null,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Gym not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('PUT /api/gym error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
