const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const upload = require('../../utils/upload');
const profileController = require('./profile.controller');

// GET own profile
router.get('/', authenticateToken, profileController.getProfile);

// UPDATE own profile (with file uploads)
router.put('/update', authenticateToken, upload.fields([
  { name: 'profile_pic', maxCount: 1 },
  { name: 'front_photo', maxCount: 1 },
  { name: 'back_photo', maxCount: 1 },
  { name: 'side_photo', maxCount: 1 },
]), profileController.updateProfile);

// GET follow status with target
router.get('/:id/follow-status', authenticateToken, profileController.getFollowStatus);

// Follow target user
router.post('/:id/follow', authenticateToken, profileController.followUser);

// Unfollow target user
router.post('/:id/unfollow', authenticateToken, profileController.unfollowUser);

// Accept follow request
router.post('/:id/accept-follow', authenticateToken, profileController.acceptFollow);

// Deny follow request
router.post('/:id/deny-follow', authenticateToken, profileController.denyFollow);

// GET current authenticated user basic me
router.get('/me', authenticateToken, profileController.getMe);

// Export user data
router.get('/export-data', authenticateToken, profileController.exportData);

// GET public profile by target id
router.get('/:id', authenticateToken, profileController.getPublicProfile);

// Remove follower
router.post('/:id/remove-follower', authenticateToken, profileController.removeFollower);

// Followers list
router.get('/:id/followers', authenticateToken, profileController.getFollowers);

// Following list
router.get('/:id/following', authenticateToken, profileController.getFollowing);

module.exports = router;
