/**
 * utils/xp.js
 * Central XP / League engine for SpotMe leaderboard.
 */

// ── League Tier Definitions (ascending by XP threshold) ───────────────────────
const TIERS = [
  { name: 'Bronze',      minXP: 0,       color: '#CD7F32', gradient: ['#CD7F32', '#8B4513'] },
  { name: 'Silver',      minXP: 2000,    color: '#A8A9AD', gradient: ['#A8A9AD', '#6C6C6C'] },
  { name: 'Gold',        minXP: 6000,    color: '#FFD700', gradient: ['#FFD700', '#B8860B'] },
  { name: 'Platinum',    minXP: 12000,   color: '#00C9C8', gradient: ['#00C9C8', '#007BFF'] },
  { name: 'Diamond',     minXP: 24000,   color: '#B9F2FF', gradient: ['#B9F2FF', '#00BFFF'] },
  { name: 'Master',      minXP: 40000,   color: '#9B59B6', gradient: ['#9B59B6', '#6C3483'] },
  { name: 'Grandmaster', minXP: 60000,   color: '#E91E63', gradient: ['#E91E63', '#880E4F'] },
  { name: 'Elite',       minXP: 80000,   color: '#FF5722', gradient: ['#FF5722', '#BF360C'] },
  { name: 'Champion',    minXP: 120000,  color: '#E00000', gradient: ['#E00000', '#7F0000'] },
  { name: 'Legend',      minXP: 200000,  color: '#FFD700', gradient: ['#FF9900', '#E00000'] },
];

/**
 * Returns the tier object for a given XP amount.
 */
function getTierForXP(xp) {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (xp >= t.minXP) tier = t;
    else break;
  }
  return tier;
}

/**
 * Returns next tier (null if Legend).
 */
function getNextTier(currentTierName) {
  const idx = TIERS.findIndex(t => t.name === currentTierName);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

/**
 * Awards XP to a user and recomputes their league tier.
 * @param {object} client - pg PoolClient (already in transaction or not)
 * @param {number} userId
 * @param {number} amount
 * @param {string} reason
 */
async function awardXP(client, userId, amount, reason) {
  // Update total_xp and level
  const userRes = await client.query('SELECT total_xp, level FROM users WHERE id = $1', [userId]);
  const oldLevel = userRes.rows[0]?.level || 1;
  let total_xp = (userRes.rows[0]?.total_xp || 0) + amount;
  total_xp = Math.max(0, total_xp);

  // Recalculate level (level 1 = 0-1999, level 2 = 2000-3999, etc.)
  let level = 1;
  while (total_xp >= level * 2000) {
    level++;
  }

  // Recompute tier
  const tier = getTierForXP(total_xp);

  await client.query(
    `UPDATE users SET total_xp = $1, level = $2, league_tier = $3 WHERE id = $4`,
    [total_xp, level, tier.name, userId]
  );

  // Log transaction
  await client.query(
    `INSERT INTO xp_transactions (user_id, amount, reason) VALUES ($1, $2, $3)`,
    [userId, amount, reason]
  );

  return { newXP: total_xp, level, tier: tier.name, leveledUp: level > oldLevel };
}

// XP constants for various actions
const XP_VALUES = {
  COMPLETE_WORKOUT:      50,
  COMPLETE_EXERCISE:     10,
  RATE_EXERCISE:          5,
  LOG_MEAL:               5,
  STREAK_BONUS_PER_DAY:   3,   // multiplied by streak count
  DAILY_LOGIN:           10,
  MISS_WORKOUT:         -20,   // penalty per missed day
  SKIP_EXERCISES:        -5,   // penalty per skipped exercise
};

module.exports = { TIERS, getTierForXP, getNextTier, awardXP, XP_VALUES };
