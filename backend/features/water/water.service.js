const { pool } = require('../../db');
const { awardXP } = require('../../utils/xp');
const { invalidateLeaderboardCache } = require('../../utils/cache');
const { sendPush } = require('../../utils/pushNotifications');

/**
 * Check and send water reminder push notification if due.
 */
async function checkSendWaterReminder(userId) {
  try {
    const user = await pool.query(
      `SELECT water_reminder_enabled, water_reminder_interval, last_water_reminded_at
       FROM users WHERE id = $1`,
      [userId]
    );
    if (!user.rows.length || !user.rows[0].water_reminder_enabled) return;

    const { water_reminder_interval, last_water_reminded_at } = user.rows[0];
    const intervalMs = (water_reminder_interval || 120) * 60 * 1000;

    // Don't remind if we already sent one within the interval
    if (last_water_reminded_at) {
      const elapsed = Date.now() - new Date(last_water_reminded_at).getTime();
      if (elapsed < intervalMs) return;
    }

    // Find the most recent water log
    const lastLog = await pool.query(
      `SELECT logged_at FROM water_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 1`,
      [userId]
    );

    // If user never logged or last log is older than interval, send reminder
    if (!lastLog.rows.length) return; // No logs ever, skip
    const sinceLastLog = Date.now() - new Date(lastLog.rows[0].logged_at).getTime();
    if (sinceLastLog < intervalMs) return; // Drank recently, no reminder needed

    await sendPush(userId, '💧 Time to Hydrate', 'Stay hydrated! Your body needs water to perform at its best.', { type: 'water_reminder' });

    await pool.query(
      'UPDATE users SET last_water_reminded_at = NOW() WHERE id = $1',
      [userId]
    );
  } catch (err) {
    console.error('checkSendWaterReminder error:', err.message);
  }
}

/**
 * Log water intake and check daily hydration goal / XP.
 */
async function logWaterIntake(userId, amountMl) {
  const result = await pool.query(
    `INSERT INTO water_logs (user_id, amount_ml, logged_at) VALUES ($1, $2, NOW()) RETURNING *`,
    [userId, amountMl]
  );

  // ── Check daily water goal ─────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  const dayTotal = await pool.query(
    `SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM water_logs
     WHERE user_id = $1 AND logged_at BETWEEN $2 AND $3`,
    [userId, todayStart, todayEnd]
  );
  const totalMl = parseInt(dayTotal.rows[0].total_ml);

  const userRes = await pool.query(
    `SELECT weight, activity_level, water_goal_date FROM users WHERE id = $1`,
    [userId]
  );
  const u = userRes.rows[0];

  // Compute target (same formula as frontend HydrationCard)
  const weight = parseFloat(u?.weight || "70") || 70;
  let target = Math.round(weight * 35);
  const lvl = (u?.activity_level || "").toLowerCase();
  if (lvl.includes("very") || lvl.includes("high") || lvl.includes("extreme")) target += 750;
  else if (lvl.includes("moderate")) target += 400;
  else if (lvl.includes("light")) target += 200;

  let xpAwarded = 0;
  if (totalMl >= target && u?.water_goal_date !== today) {
    await awardXP(pool, userId, 10, 'Reached daily water goal');
    xpAwarded = 10;
    invalidateLeaderboardCache();
    await pool.query('UPDATE users SET water_goal_date = $1 WHERE id = $2', [today, userId]);
  }

  // Reset reminder timer — user just drank
  await pool.query('UPDATE users SET last_water_reminded_at = NULL WHERE id = $1', [userId]);

  return {
    ...result.rows[0],
    xp_awarded: xpAwarded,
    daily_total_ml: totalMl,
    daily_goal_ml: target,
  };
}

/**
 * Get distinct dates that have water logs.
 */
async function getLoggedDates(userId) {
  const result = await pool.query(
    `SELECT DISTINCT DATE(logged_at) AS date FROM water_logs WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map(r => {
    const d = new Date(r.date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${dateVal}`;
  });
}

/**
 * Get water logs for a specific day.
 */
async function getWaterLogsByDate(userId, dateStr) {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));
  const end   = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

  const result = await pool.query(
    `SELECT * FROM water_logs WHERE user_id = $1 AND logged_at BETWEEN $2 AND $3 ORDER BY logged_at DESC`,
    [userId, start.toISOString(), end.toISOString()]
  );
  const totalMl = result.rows.reduce((sum, r) => sum + r.amount_ml, 0);

  return { logs: result.rows, total_ml: totalMl };
}

/**
 * Reset all water logs for a day.
 */
async function resetWaterLogs(userId, dateStr) {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 0, 0, 0, 0));
  const end   = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 23, 59, 59, 999));

  await pool.query(
    `DELETE FROM water_logs WHERE user_id = $1 AND logged_at BETWEEN $2 AND $3`,
    [userId, start.toISOString(), end.toISOString()]
  );
}

/**
 * Delete a specific water log by id.
 */
async function deleteWaterLog(userId, logId) {
  const result = await pool.query(
    'DELETE FROM water_logs WHERE id = $1 AND user_id = $2 RETURNING *',
    [parseInt(logId), userId]
  );
  return result.rows.length > 0;
}

/**
 * Get user reminder settings.
 */
async function getReminderSettings(userId) {
  const result = await pool.query(
    `SELECT water_reminder_enabled, water_reminder_interval FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

/**
 * Update user reminder settings.
 */
async function updateReminderSettings(userId, { water_reminder_enabled, water_reminder_interval }) {
  await pool.query(
    `UPDATE users SET water_reminder_enabled = $1, water_reminder_interval = $2 WHERE id = $3`,
    [water_reminder_enabled, water_reminder_interval || 120, userId]
  );
}

module.exports = {
  checkSendWaterReminder,
  logWaterIntake,
  getLoggedDates,
  getWaterLogsByDate,
  resetWaterLogs,
  deleteWaterLog,
  getReminderSettings,
  updateReminderSettings,
};
