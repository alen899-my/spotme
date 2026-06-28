const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const result = await pool.query(
      `INSERT INTO feedback (user_id, category, title, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [userId, category || 'General', title.trim(), description.trim()]
    );

    res.status(201).json({ success: true, feedback: result.rows[0] });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
