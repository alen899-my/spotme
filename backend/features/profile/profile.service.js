const { pool } = require('../../db');
const { sendPush } = require('../../utils/pushNotifications');

function getFollowStatus(followerId, followingId) {
  return pool.query(
    `SELECT status FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [followerId, followingId]
  ).then(r => r.rows[0]?.status || null);
}

/**
 * Get own profile by user ID.
 */
async function getOwnProfile(userId) {
  const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (userQuery.rows.length === 0) return null;
  const user = userQuery.rows[0];
  delete user.password;
  return user;
}

/**
 * Update profile fields.
 */
async function updateProfile(userId, updates) {
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
    const err = new Error("No valid fields provided for update");
    err.status = 400;
    throw err;
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
  return user;
}

/**
 * Follow or request to follow target user.
 */
async function followUser(currentUserId, targetId) {
  if (currentUserId === targetId) {
    const err = new Error('Cannot follow yourself');
    err.status = 400;
    throw err;
  }

  const targetUser = await pool.query('SELECT is_private FROM users WHERE id = $1', [targetId]);
  if (targetUser.rows.length === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
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

  return { status };
}

/**
 * Unfollow target user.
 */
async function unfollowUser(currentUserId, targetId) {
  await pool.query(
    `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [currentUserId, targetId]
  );
}

/**
 * Accept a pending follow request.
 */
async function acceptFollowRequest(currentUserId, targetId) {
  const result = await pool.query(
    `UPDATE follows SET status = 'accepted'
     WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'
     RETURNING *`,
    [targetId, currentUserId]
  );

  if (result.rows.length === 0) return false;

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

  return true;
}

/**
 * Deny a pending follow request.
 */
async function denyFollowRequest(currentUserId, targetId) {
  await pool.query(
    `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'`,
    [targetId, currentUserId]
  );
}

/**
 * Get basic current user me.
 */
async function getMe(userId) {
  const result = await pool.query(
    'SELECT id, full_name, profile_pic_url, league_tier, total_xp FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

/**
 * Export all user data (GDPR).
 */
async function exportUserData(userId) {
  const [userRes, workoutsRes, weightRes, waterRes, mealsRes, xpRes, physiqueRes, reportsRes, feedbackRes] = await Promise.all([
    pool.query('SELECT * FROM users WHERE id = $1', [userId]),
    pool.query(`
      SELECT dw.*, json_agg(
        json_build_object(
          'id', dwe.id, 'exercise_id', dwe.exercise_id, 'target_sets', dwe.target_sets,
          'target_reps', dwe.target_reps, 'target_weight', dwe.target_weight,
          'sort_order', dwe.sort_order, 'is_completed', dwe.is_completed, 'is_skipped', dwe.is_skipped,
          'sets', (SELECT json_agg(json_build_object(
            'set_number', dws.set_number, 'weight', dws.weight, 'reps', dws.reps,
            'duration_seconds', dws.duration_seconds, 'rest_seconds', dws.rest_seconds,
            'is_skipped', dws.is_skipped, 'completed_at', dws.completed_at
          ) ORDER BY dws.set_number) FROM daily_workout_sets dws WHERE dws.daily_exercise_id = dwe.id)
        ) ORDER BY dwe.sort_order
      ) AS exercises
      FROM daily_workouts dw
      LEFT JOIN daily_workout_exercises dwe ON dwe.daily_workout_id = dw.id
      WHERE dw.user_id = $1
      GROUP BY dw.id
      ORDER BY dw.completed_at DESC NULLS LAST
    `, [userId]),
    pool.query('SELECT * FROM weight_logs WHERE user_id = $1 ORDER BY logged_at DESC', [userId]),
    pool.query('SELECT * FROM water_logs WHERE user_id = $1 ORDER BY logged_at DESC', [userId]),
    pool.query(`SELECT * FROM meal_recommendations WHERE user_id = $1`, [userId]),
    pool.query('SELECT * FROM xp_transactions WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
    pool.query('SELECT * FROM physique_analyses WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
    pool.query('SELECT * FROM workout_reports WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
    pool.query('SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
  ]);

  const user = userRes.rows[0];
  if (!user) return null;
  delete user.password;

  return {
    exported_at: new Date().toISOString(),
    user,
    measurements: {
      neck: user.neck, waist: user.waist, hip: user.hip,
      chest: user.chest, arm: user.arm, thigh: user.thigh,
      body_fat: user.body_fat, height: user.height, weight: user.weight,
    },
    workouts: workoutsRes.rows,
    weight_logs: weightRes.rows,
    water_logs: waterRes.rows,
    diet_recommendations: mealsRes.rows,
    xp_transactions: xpRes.rows,
    physique_analyses: physiqueRes.rows,
    workout_reports: reportsRes.rows,
    feedback: feedbackRes.rows,
  };
}

/**
 * Get public profile by target ID with privacy checks.
 */
async function getPublicProfile(targetId, currentUserId, limit = 10) {
  const userQuery = await pool.query(`
    SELECT id, full_name, profile_pic_url, gender, age, height,
           COALESCE(
             (
               SELECT weight FROM (
                 SELECT weight::numeric AS weight, logged_at AS ts FROM weight_logs WHERE user_id = $1
                 UNION ALL
                 SELECT post_workout_weight::numeric AS weight, completed_at AS ts
                 FROM daily_workouts
                 WHERE user_id = $1 AND post_workout_weight IS NOT NULL AND status = 'completed'
               ) latest_weights
               ORDER BY ts DESC
               LIMIT 1
             ),
             weight::numeric
           ) AS weight,
           total_xp AS xp, level, league_tier, current_streak, last_workout_date, 
           fitness_goal, experience_level, is_private,
      (SELECT COUNT(*) FROM follows WHERE following_id = $1 AND status = 'accepted') AS follower_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = $1 AND status = 'accepted') AS following_count
    FROM users 
    WHERE id = $1
  `, [targetId]);

  if (userQuery.rows.length === 0) return null;
  const user = userQuery.rows[0];

  let canViewFull = true;
  let followStatus = null;
  let hasPendingFromTarget = false;

  if (targetId !== currentUserId) {
    followStatus = await getFollowStatus(currentUserId, targetId);
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
    const workoutLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
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

    return {
      user,
      workouts: workoutsQuery.rows,
      rest_days: restDays,
      can_view_full: true,
      follow_status: followStatus,
      has_pending_from_target: hasPendingFromTarget,
      is_following_back: isFollowingBack,
    };
  } else {
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

    return {
      user: basicUser,
      workouts: [],
      can_view_full: false,
      follow_status: followStatus,
      has_pending_from_target: hasPendingFromTarget,
      is_following_back: isFollowingBack,
    };
  }
}

/**
 * Remove follower.
 */
async function removeFollower(currentUserId, targetId) {
  const result = await pool.query(
    `DELETE FROM follows
     WHERE follower_id = $1 AND following_id = $2 AND status = 'accepted'
     RETURNING id`,
    [targetId, currentUserId]
  );
  return result.rows.length > 0;
}

/**
 * Get followers of target user.
 */
async function getFollowers(targetId, currentUserId) {
  const result = await pool.query(`
    SELECT u.id, u.full_name, u.profile_pic_url, u.total_xp AS xp, u.league_tier, u.current_streak,
      EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = $2 AND f2.following_id = u.id AND f2.status = 'accepted') AS is_followed_by_me
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = $1 AND f.status = 'accepted'
    ORDER BY f.created_at DESC
  `, [targetId, currentUserId]);
  return result.rows;
}

/**
 * Get users that target user is following.
 */
async function getFollowing(targetId, currentUserId) {
  const result = await pool.query(`
    SELECT u.id, u.full_name, u.profile_pic_url, u.total_xp AS xp, u.league_tier, u.current_streak,
      EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = u.id AND f2.following_id = $2 AND f2.status = 'accepted') AS follows_me
    FROM follows f
    JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = $1 AND f.status = 'accepted'
    ORDER BY f.created_at DESC
  `, [targetId, currentUserId]);
  return result.rows;
}

module.exports = {
  getFollowStatus,
  getOwnProfile,
  updateProfile,
  followUser,
  unfollowUser,
  acceptFollowRequest,
  denyFollowRequest,
  getMe,
  exportUserData,
  getPublicProfile,
  removeFollower,
  getFollowers,
  getFollowing,
};
