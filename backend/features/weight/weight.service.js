const { pool } = require('../../db');

/**
 * Inserts a new weight entry for a user.
 */
async function logWeight(userId, { weight, notes }) {
  const result = await pool.query(
    'INSERT INTO weight_logs (user_id, weight, notes) VALUES ($1, $2, $3) RETURNING *',
    [userId, parseFloat(weight), notes || null]
  );
  return result.rows[0];
}

/**
 * Fetches all weight entries for user, including deduped post-workout weights.
 */
async function getWeightLogs(userId, { limit, range }) {
  let logFilter = '';
  let workoutFilter = '';
  if (range === '7d') {
    logFilter = "AND logged_at >= NOW() - INTERVAL '7 days'";
    workoutFilter = "AND dw.completed_at >= NOW() - INTERVAL '7 days'";
  } else if (range === '30d') {
    logFilter = "AND logged_at >= NOW() - INTERVAL '30 days'";
    workoutFilter = "AND dw.completed_at >= NOW() - INTERVAL '30 days'";
  } else if (range === '90d') {
    logFilter = "AND logged_at >= NOW() - INTERVAL '90 days'";
    workoutFilter = "AND dw.completed_at >= NOW() - INTERVAL '90 days'";
  } else if (range === '1y') {
    logFilter = "AND logged_at >= NOW() - INTERVAL '365 days'";
    workoutFilter = "AND dw.completed_at >= NOW() - INTERVAL '365 days'";
  }

  const result = await pool.query(
    `SELECT * FROM (
      SELECT DISTINCT ON (logged_at::date, ROUND(weight::numeric, 1))
        id, weight::text, notes, logged_at
      FROM (
        SELECT id, weight::text AS weight, notes, logged_at FROM weight_logs WHERE user_id = $1 ${logFilter}
        UNION ALL
        SELECT -(dw.id) AS id, dw.post_workout_weight::text AS weight,
               'Post-workout' AS notes,
               dw.completed_at AS logged_at
        FROM daily_workouts dw
        WHERE dw.user_id = $1 AND dw.post_workout_weight IS NOT NULL AND dw.status = 'completed' ${workoutFilter}
      ) combined
      ORDER BY logged_at::date, ROUND(weight::numeric, 1), logged_at DESC
    ) deduped ORDER BY logged_at ASC` +
      (limit ? ' LIMIT ' + parseInt(limit) : ''),
    [userId]
  );

  return result.rows;
}

/**
 * Deletes a weight entry belonging to user.
 */
async function deleteWeightLog(userId, logId) {
  const result = await pool.query(
    'DELETE FROM weight_logs WHERE id = $1 AND user_id = $2 RETURNING id',
    [logId, userId]
  );
  return result.rows.length > 0;
}

module.exports = {
  logWeight,
  getWeightLogs,
  deleteWeightLog,
};
