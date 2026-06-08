const express = require('express');
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { registerToken, removeToken } = require('../utils/pushNotifications');

const router = express.Router();

// POST /api/notifications/push-token – register Expo push token
router.post('/push-token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    await registerToken(req.user.id, token);
    res.json({ success: true });
  } catch (err) {
    console.error('POST /notifications/push-token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/notifications/push-token – remove token on logout
router.delete('/push-token', authenticateToken, async (req, res) => {
  try {
    await removeToken(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /notifications/push-token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/notifications – get current user's notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, u.full_name AS from_user_name, u.profile_pic_url AS from_user_pic
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [req.user.id]);

    const unreadCount = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({
      notifications: result.rows,
      unread_count: Number(unreadCount.rows[0].count),
    });
  } catch (error) {
    console.error("GET /notifications error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notifications/read-all – mark all as read
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("POST /notifications/read-all error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notifications/:id/read – mark single notification as read
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("POST /notifications/:id/read error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
