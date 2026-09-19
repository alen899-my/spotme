const express = require('express');
const authenticateToken = require('../../middleware/auth');
const notificationsController = require('./notifications.controller');

const router = express.Router();

// POST /api/notifications/push-token – register Expo push token
router.post('/push-token', authenticateToken, notificationsController.registerPushToken);

// DELETE /api/notifications/push-token – remove token on logout
router.delete('/push-token', authenticateToken, notificationsController.removePushToken);

// GET /api/notifications – get current user's notifications
router.get('/', authenticateToken, notificationsController.getNotifications);

// POST /api/notifications/read-all – mark all as read
router.post('/read-all', authenticateToken, notificationsController.markAllAsRead);

// POST /api/notifications/:id/read – mark single notification as read
router.post('/:id/read', authenticateToken, notificationsController.markSingleAsRead);

module.exports = router;
