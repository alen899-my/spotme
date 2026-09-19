const { pool } = require('../../db');

/**
 * Creates a new feedback entry for a user.
 */
async function createFeedback({ userId, category, title, description }) {
  const result = await pool.query(
    `INSERT INTO feedback (user_id, category, title, description)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [userId, category || 'General', title.trim(), description.trim()]
  );
  return result.rows[0];
}

module.exports = {
  createFeedback,
};
