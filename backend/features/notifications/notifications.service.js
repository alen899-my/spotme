const { pool } = require('../../db');

/**
 * Fetches notifications and unread count for user.
 */
async function getUserNotifications(userId) {
  const result = await pool.query(`
    SELECT n.*, u.full_name AS from_user_name, u.profile_pic_url AS from_user_pic
    FROM notifications n
    LEFT JOIN users u ON n.from_user_id = u.id
    WHERE n.user_id = $1
    ORDER BY n.created_at DESC
    LIMIT 50
  `, [userId]);

  const unreadCount = await pool.query(
    `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );

  return {
    notifications: result.rows,
    unread_count: Number(unreadCount.rows[0].count),
  };
}

/**
 * Marks all notifications as read for user.
 */
async function markAllNotificationsRead(userId) {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
}

/**
 * Marks a single notification as read for user.
 */
async function markNotificationRead(userId, notificationId) {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}

module.exports = {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
};
