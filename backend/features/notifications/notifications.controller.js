const notificationsService = require('./notifications.service');
const { registerToken, removeToken } = require('../../utils/pushNotifications');

/**
 * Register Expo push token.
 */
async function registerPushToken(req, res) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    await registerToken(req.user.id, token);
    return res.json({ success: true });
  } catch (err) {
    console.error('POST /notifications/push-token error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Remove push token on logout.
 */
async function removePushToken(req, res) {
  try {
    await removeToken(req.user.id);
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /notifications/push-token error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Get current user's notifications.
 */
async function getNotifications(req, res) {
  try {
    const data = await notificationsService.getUserNotifications(req.user.id);
    return res.json(data);
  } catch (error) {
    console.error('GET /notifications error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Mark all notifications as read.
 */
async function markAllAsRead(req, res) {
  try {
    await notificationsService.markAllNotificationsRead(req.user.id);
    return res.json({ success: true });
  } catch (error) {
    console.error('POST /notifications/read-all error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Mark single notification as read.
 */
async function markSingleAsRead(req, res) {
  try {
    await notificationsService.markNotificationRead(req.user.id, req.params.id);
    return res.json({ success: true });
  } catch (error) {
    console.error('POST /notifications/:id/read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  registerPushToken,
  removePushToken,
  getNotifications,
  markAllAsRead,
  markSingleAsRead,
};
