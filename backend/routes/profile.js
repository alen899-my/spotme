const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const upload = require('../uploadConfig');
const authenticateToken = require('../middleware/auth');
const { sendPush } = require('../utils/pushNotifications');

const router = express.Router();

function getFollowStatus(followerId, followingId) {
  return pool.query(
    `SELECT status FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [followerId, followingId]
  ).then(r => r.rows[0]?.status || null);
}

// GET PROFILE (own)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userQuery.rows[0];
    delete user.password;
    res.json(user);
  } catch (error) {
    console.error("GET /profile error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE PROFILE
router.put('/update', authenticateToken, upload.fields([
  { name: 'profile_pic', maxCount: 1 },
  { name: 'front_photo', maxCount: 1 },
  { name: 'back_photo', maxCount: 1 },
  { name: 'side_photo', maxCount: 1 },
]), async (req, res) => {
  try {
    const userId = req.user.id;
    let updates = { ...req.body };

    if (req.files) {
      const getFileUrl = (fieldname) => {
        if (req.files[fieldname] && req.files[fieldname].length > 0) {
          return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${req.files[fieldname][0].key}`;
        }
        return null;
      };

      const profilePicUrl = getFileUrl('profile_pic');
      const frontPhotoUrl = getFileUrl('front_photo');
      const backPhotoUrl = getFileUrl('back_photo');
      const sidePhotoUrl = getFileUrl('side_photo');

      if (profilePicUrl) updates.profile_pic_url = profilePicUrl;
      if (frontPhotoUrl) updates.front_photo_url = frontPhotoUrl;
      if (backPhotoUrl) updates.back_photo_url = backPhotoUrl;
      if (sidePhotoUrl) updates.side_photo_url = sidePhotoUrl;
    }

    const allowedFields = [
      'full_name', 'email', 'phone_number', 'dob', 'gender',
      'age', 'height', 'weight', 'body_fat',
      'fitness_goal', 'experience_level', 'activity_level',
      'neck', 'waist', 'hip', 'chest', 'arm', 'thigh',
      'medical_conditions', 'medication', 'allergies',
      'diet_type', 'food_preference', 'water_intake', 'food_allergies',
      'profile_pic_url', 'front_photo_url', 'back_photo_url', 'side_photo_url',
      'is_private',
      'share_splits'
    ];

    const fieldsToUpdate = [];
    const values = [];
    let queryIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fieldsToUpdate.push(`${field} = $${queryIndex}`);
        values.push(updates[field] === "" ? null : updates[field]);
        queryIndex++;
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    values.push(userId);
    const query = `
      UPDATE users 
      SET ${fieldsToUpdate.join(', ')} 
      WHERE id = $${queryIndex} 
      RETURNING *
    `;

    const updatedUser = await pool.query(query, values);
    
    const user = updatedUser.rows[0];
    delete user.password;
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: user
    });
  } catch (error) {
    console.error("PUT /profile/update error:", error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// GET FOLLOW STATUS between current user and target user
router.get('/:id/follow-status', authenticateToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.id;
    const status = await getFollowStatus(currentUserId, targetId);
    const isFollowingBack = await getFollowStatus(targetId, currentUserId);
    res.json({ status, is_following_back: isFollowingBack === 'accepted' });
  } catch (error) {
    console.error("GET /profile/:id/follow-status error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// FOLLOW / REQUEST TO FOLLOW
router.post('/:id/follow', authenticateToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.id;

    if (currentUserId === targetId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const targetUser = await pool.query('SELECT is_private FROM users WHERE id = $1', [targetId]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPrivate = targetUser.rows[0].is_private;
    const status = isPrivate ? 'pending' : 'accepted';

    await pool.query(
      `INSERT INTO follows (follower_id, following_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (follower_id, following_id) 
       DO UPDATE SET status = $3`,
      [currentUserId, targetId, status]
    );

    // Create notification for the target user
    const currentUserInfo = await pool.query(
      'SELECT full_name FROM users WHERE id = $1', [currentUserId]
    );
    const followerName = currentUserInfo.rows[0]?.full_name || 'Someone';

    const message = isPrivate
      ? `${followerName} wants to follow you`
      : `${followerName} started following you`;

    await pool.query(
      `INSERT INTO notifications (user_id, type, from_user_id, message)
       VALUES ($1, $2, $3, $4)`,
      [targetId, isPrivate ? 'follow_request' : 'follow_accept', currentUserId, message]
    );

    sendPush(targetId, isPrivate ? 'New Follow Request' : 'New Follower', message, {
      type: isPrivate ? 'follow_request' : 'follow_accept',
      fromUserId: currentUserId,
    });

    res.json({ success: true, status });
  } catch (error) {
    console.error("POST /profile/:id/follow error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UNFOLLOW
router.post('/:id/unfollow', authenticateToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.id;

    await pool.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [currentUserId, targetId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("POST /profile/:id/unfollow error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ACCEPT FOLLOW REQUEST
router.post('/:id/accept-follow', authenticateToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.id;

    const result = await pool.query(
      `UPDATE follows SET status = 'accepted'
       WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'
       RETURNING *`,
      [targetId, currentUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No pending follow request found' });
    }

    // Notify the follower that they were accepted
    const currentUserInfo = await pool.query(
      'SELECT full_name FROM users WHERE id = $1', [currentUserId]
    );
    const name = currentUserInfo.rows[0]?.full_name || 'Someone';

    await pool.query(
      `INSERT INTO notifications (user_id, type, from_user_id, message)
       VALUES ($1, 'follow_accepted', $2, $3)`,
      [targetId, currentUserId, `${name} accepted your follow request`]
    );

    sendPush(targetId, 'Follow Request Accepted', `${name} accepted your follow request`, {
      type: 'follow_accepted',
      fromUserId: currentUserId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("POST /profile/:id/accept-follow error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DENY FOLLOW REQUEST
router.post('/:id/deny-follow', authenticateToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.id;

    await pool.query(
      `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'`,
      [targetId, currentUserId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("POST /profile/:id/deny-follow error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /profile/me — current authenticated user info ─────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, profile_pic_url, league_tier, total_xp FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("GET /profile/me error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET PUBLIC PROFILE BY ID (with privacy check)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const currentUserId = req.user.id;

    const userQuery = await pool.query(`
      SELECT id, full_name, profile_pic_url, gender, age, height, weight, 
             total_xp AS xp, level, league_tier, current_streak, last_workout_date, 
             fitness_goal, experience_level, is_private,
        (SELECT COUNT(*) FROM follows WHERE following_id = $1 AND status = 'accepted') AS follower_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = $1 AND status = 'accepted') AS following_count
      FROM users 
      WHERE id = $1
    `, [targetId]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userQuery.rows[0];

    // Check privacy: if private and not the owner, check follow status
    let canViewFull = true;
    let followStatus = null;
    let hasPendingFromTarget = false;

    if (targetId !== currentUserId) {
      const fs = await getFollowStatus(currentUserId, targetId);
      followStatus = fs;
      // Check if target user has a pending follow request to current user
      const targetToCurrent = await pool.query(
        `SELECT status FROM follows WHERE follower_id = $1 AND following_id = $2`,
        [targetId, currentUserId]
      );
      hasPendingFromTarget = targetToCurrent.rows[0]?.status === 'pending';
    }

    let isFollowingBack = false;
    if (targetId !== currentUserId) {
      const backStatus = await getFollowStatus(targetId, currentUserId);
      isFollowingBack = backStatus === 'accepted';
    }

    if (targetId !== currentUserId && user.is_private && followStatus !== 'accepted') {
      canViewFull = false;
    }

    if (canViewFull) {
      const workoutLimit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
      // Fetch user's recent workouts
      const workoutsQuery = await pool.query(`
        SELECT dw.*,
          ws.name AS split_name,
          wsess.name AS session_name,
          (SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = dw.id) AS exercise_count,
          (SELECT COUNT(*) FROM daily_workout_exercises WHERE daily_workout_id = dw.id AND is_completed = true) AS completed_count,
          (SELECT COUNT(*) FROM daily_workout_sets dws 
           JOIN daily_workout_exercises dwe ON dws.daily_exercise_id = dwe.id 
           WHERE dwe.daily_workout_id = dw.id AND dws.is_skipped = false) AS total_sets,
          (SELECT photo_url FROM daily_workout_photos WHERE daily_workout_id = dw.id ORDER BY created_at ASC LIMIT 1) AS cover_photo_url
        FROM daily_workouts dw
        LEFT JOIN workout_splits ws ON dw.split_id = ws.id
        LEFT JOIN workout_sessions wsess ON dw.session_id = wsess.id
        WHERE dw.user_id = $1 AND dw.status = 'completed'
        ORDER BY dw.started_at DESC
        LIMIT $2
      `, [targetId, workoutLimit]);

      // Fetch rest days for streak display (last 60 days)
      const restDaysQuery = await pool.query(`
        SELECT completed_at AS date, rest_type FROM daily_workouts
        WHERE user_id = $1 AND status = 'rest'
          AND completed_at >= CURRENT_DATE - INTERVAL '60 days'
        ORDER BY completed_at DESC
      `, [targetId]);
      const restDays = restDaysQuery.rows.reduce((acc, r) => {
        const dateStr = new Date(r.date).toISOString().split('T')[0];
        acc[dateStr] = r.rest_type || 'fatigue';
        return acc;
      }, {});

      res.json({
        user,
        workouts: workoutsQuery.rows,
        rest_days: restDays,
        can_view_full: true,
        follow_status: followStatus,
        has_pending_from_target: hasPendingFromTarget,
        is_following_back: isFollowingBack,
      });
    } else {
      // Private profile – only return basic info (hero card data)
      const basicUser = {
        id: user.id,
        full_name: user.full_name,
        profile_pic_url: user.profile_pic_url,
        xp: user.xp,
        level: user.level,
        league_tier: user.league_tier,
        current_streak: user.current_streak,
        fitness_goal: user.fitness_goal,
        is_private: user.is_private,
      };

      res.json({
        user: basicUser,
        workouts: [],
        can_view_full: false,
        follow_status: followStatus,
        has_pending_from_target: hasPendingFromTarget,
        is_following_back: isFollowingBack,
      });
    }
  } catch (error) {
    console.error("GET /profile/:id error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /profile/:id/remove-follower — remove a follower ────────────────
router.post('/:id/remove-follower', authenticateToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.id;

    const result = await pool.query(
      `DELETE FROM follows
       WHERE follower_id = $1 AND following_id = $2 AND status = 'accepted'
       RETURNING id`,
      [targetId, currentUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Follower not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("POST /profile/:id/remove-follower error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /profile/:id/followers — list of users following this user ──────────
router.get('/:id/followers', authenticateToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.id;
    if (isNaN(targetId)) return res.status(400).json({ message: 'Invalid user ID' });

    const result = await pool.query(`
      SELECT u.id, u.full_name, u.profile_pic_url, u.total_xp AS xp, u.league_tier, u.current_streak,
        EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = $2 AND f2.following_id = u.id AND f2.status = 'accepted') AS is_followed_by_me
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1 AND f.status = 'accepted'
      ORDER BY f.created_at DESC
    `, [targetId, currentUserId]);

    res.json({ users: result.rows });
  } catch (error) {
    console.error("GET /profile/:id/followers error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /profile/:id/following — list of users this user follows ──────────
router.get('/:id/following', authenticateToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.user.id;
    if (isNaN(targetId)) return res.status(400).json({ message: 'Invalid user ID' });

    const result = await pool.query(`
      SELECT u.id, u.full_name, u.profile_pic_url, u.total_xp AS xp, u.league_tier, u.current_streak,
        EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = u.id AND f2.following_id = $2 AND f2.status = 'accepted') AS follows_me
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1 AND f.status = 'accepted'
      ORDER BY f.created_at DESC
    `, [targetId, currentUserId]);

    res.json({ users: result.rows });
  } catch (error) {
    console.error("GET /profile/:id/following error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
