const { pool } = require('../../db');
const { TIERS, getTierForXP, getNextTier, awardXP, XP_VALUES } = require('../../utils/xp');
const { lbCache, invalidateLeaderboardCache } = require('../../utils/cache');

const VALID_ACTIONS = {
  complete_workout:  XP_VALUES.COMPLETE_WORKOUT,
  complete_exercise: XP_VALUES.COMPLETE_EXERCISE,
  rate_exercise:     XP_VALUES.RATE_EXERCISE,
  log_meal:          XP_VALUES.LOG_MEAL,
  daily_login:       XP_VALUES.DAILY_LOGIN,
};

/**
 * Get tier definitions.
 */
function getTiers() {
  return TIERS;
}

/**
 * Get global rankings with optional tier filter.
 */
async function getRankings({ limit, offset, tier }) {
  const cacheKey = `list:${tier}:${offset}:${limit}`;
  const cached = lbCache.get(cacheKey);
  if (cached) return cached;

  const filterByTier = tier && tier !== 'All';
  let sql, params;

  if (filterByTier) {
    sql = `
      SELECT
        id, full_name, profile_pic_url,
        total_xp            AS xp,
        league_tier,
        current_streak,
        prev_rank,
        -- Global rank across ALL users
        ROW_NUMBER() OVER (ORDER BY total_xp DESC)                              AS global_rank,
        -- Total users in this tier (for pagination)
        COUNT(*) OVER (PARTITION BY league_tier)                                AS total_count
      FROM users
      WHERE league_tier = $1
      ORDER BY total_xp DESC
      LIMIT  $2
      OFFSET $3
    `;
    params = [tier, limit, offset];
  } else {
    sql = `
      SELECT
        id, full_name, profile_pic_url,
        total_xp            AS xp,
        league_tier,
        current_streak,
        prev_rank,
        ROW_NUMBER() OVER (ORDER BY total_xp DESC)  AS global_rank,
        COUNT(*) OVER ()                             AS total_count
      FROM users
      ORDER BY total_xp DESC
      LIMIT  $1
      OFFSET $2
    `;
    params = [limit, offset];
  }

  const result = await pool.query(sql, params);
  const total  = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;

  const rows = result.rows.map(row => {
    const rank   = Number(row.global_rank);
    const prev   = Number(row.prev_rank);
    return {
      id:             row.id,
      full_name:      row.full_name,
      profile_pic_url:row.profile_pic_url,
      xp:             row.xp,
      league_tier:    row.league_tier,
      current_streak: row.current_streak,
      global_rank:    rank,
      rank_change:    prev > 0 ? prev - rank : 0,
    };
  });

  const payload = { data: rows, total };
  lbCache.set(cacheKey, payload);

  // Async batch UPDATE prev_rank (fire-and-forget)
  if (rows.length > 0) {
    const values = rows.map((r, i) => `($${i * 2 + 1}::int, $${i * 2 + 2}::int)`).join(',');
    const flat   = rows.flatMap(r => [r.id, r.global_rank]);
    pool.query(
      `UPDATE users SET prev_rank = v.rank
       FROM (VALUES ${values}) AS v(id, rank)
       WHERE users.id = v.id`,
      flat
    ).catch(err => console.error('prev_rank batch update error:', err));
  }

  return payload;
}

/**
 * Get current user rank, tier info, and nearby users.
 */
async function getMyRank(userId) {
  const cacheKey = `me:${userId}`;
  const cached = lbCache.get(cacheKey);
  if (cached) return cached;

  const result = await pool.query(
    `SELECT
        u.id, u.full_name, u.profile_pic_url,
        u.total_xp    AS xp,
        u.league_tier,
        u.current_streak,
        (SELECT COUNT(*) FROM users WHERE total_xp > u.total_xp) + 1  AS global_rank,
        (SELECT COUNT(*)                                    FROM users) AS total_users
     FROM users u
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const user      = result.rows[0];
  const tier      = getTierForXP(user.xp);
  const nextTier  = getNextTier(tier.name);
  const rank      = Number(user.global_rank);

  const xpInCurrentTier = user.xp - tier.minXP;
  const tierRange       = nextTier ? nextTier.minXP - tier.minXP : 1;
  const tierProgress    = nextTier ? Math.min(100, Math.round((xpInCurrentTier / tierRange) * 100)) : 100;
  const xpToNext        = nextTier ? nextTier.minXP - user.xp : null;

  const nearby = await pool.query(
    `SELECT id, full_name, profile_pic_url, total_xp AS xp, league_tier,
            ROW_NUMBER() OVER (ORDER BY total_xp DESC) AS global_rank
     FROM users
     ORDER BY total_xp DESC
     LIMIT 5 OFFSET $1`,
    [Math.max(0, rank - 3)]
  );

  const payload = {
    ...user,
    global_rank:   rank,
    tier,
    next_tier:     nextTier,
    xp_to_next:    xpToNext,
    tier_progress: tierProgress,
    nearby:        nearby.rows,
  };

  lbCache.set(cacheKey, payload);
  return payload;
}

/**
 * Get rows around current user.
 */
async function getNearbyRankings(userId, { count, extraOffset }) {
  const cacheKey = `nearby:${userId}:${count}:${extraOffset}`;
  const cached = lbCache.get(cacheKey);
  if (cached) return cached;

  const belowLimit  = count + 1;

  const rankRes = await pool.query(
    `SELECT
        u.id, u.full_name, u.profile_pic_url,
        u.total_xp AS xp, u.league_tier, u.current_streak,
        (SELECT COUNT(*) FROM users WHERE total_xp > u.total_xp) + 1 AS global_rank,
        (SELECT COUNT(*) FROM users)                                   AS total_users
     FROM users u WHERE u.id = $1`,
    [userId]
  );
  if (rankRes.rows.length === 0) return null;

  const myRow  = rankRes.rows[0];
  const myRank = Number(myRow.global_rank);
  const total  = Number(myRow.total_users);

  const aboveOffset = Math.max(0, myRank - 1 - count);
  const aboveLimit  = myRank - 1 - aboveOffset;

  const aboveRes = aboveLimit > 0
    ? await pool.query(
        `SELECT id, full_name, profile_pic_url, total_xp AS xp, league_tier, current_streak,
                ROW_NUMBER() OVER (ORDER BY total_xp DESC) AS global_rank
         FROM users ORDER BY total_xp DESC
         LIMIT $1 OFFSET $2`,
        [aboveLimit, aboveOffset]
      )
    : { rows: [] };

  const belowRes = await pool.query(
    `SELECT id, full_name, profile_pic_url, total_xp AS xp, league_tier, current_streak,
            ROW_NUMBER() OVER (ORDER BY total_xp DESC) AS global_rank
     FROM users ORDER BY total_xp DESC
     LIMIT $1 OFFSET $2`,
    [belowLimit, myRank + extraOffset]
  );

  const belowRows  = belowRes.rows.slice(0, count);
  const hasMoreBelow = belowRes.rows.length > count;

  const payload = {
    myRank,
    total,
    above: aboveRes.rows.map(r => ({ ...r, global_rank: Number(r.global_rank) })),
    me: { ...myRow, global_rank: myRank },
    below: belowRows.map(r => ({ ...r, global_rank: Number(r.global_rank) })),
    hasMoreBelow,
  };

  lbCache.set(cacheKey, payload);
  return payload;
}

/**
 * Get top 10 users.
 */
async function getTopUsers() {
  const cacheKey = 'top';
  const cached = lbCache.get(cacheKey);
  if (cached) return cached;

  const result = await pool.query(
    `SELECT
        id, full_name, profile_pic_url,
        total_xp AS xp,
        league_tier,
        current_streak,
        prev_rank
     FROM users
     ORDER BY total_xp DESC
     LIMIT 10`
  );

  const rows = result.rows.map((row, i) => ({
    ...row,
    global_rank: i + 1,
    rank_change: Number(row.prev_rank) > 0 ? Number(row.prev_rank) - (i + 1) : 0,
  }));

  lbCache.set(cacheKey, rows, 30_000);
  return rows;
}

/**
 * Award XP to user for an action.
 */
async function awardUserXP(userId, action) {
  if (!action || !(action in VALID_ACTIONS)) {
    const err = new Error('Invalid action');
    err.status = 400;
    throw err;
  }

  const amount = VALID_ACTIONS[action];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await awardXP(client, userId, amount, action);
    await client.query('COMMIT');
    invalidateLeaderboardCache();
    return { success: true, ...result, action, amount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get recent XP history for user.
 */
async function getUserXPLog(userId) {
  const result = await pool.query(
    `SELECT amount, reason, created_at
     FROM xp_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );
  return result.rows;
}

/**
 * Search users by full_name.
 */
async function searchUsersByName(query) {
  const q = (query || '').trim();
  if (!q) return [];

  const result = await pool.query(
    `SELECT id, full_name, profile_pic_url, total_xp AS xp, league_tier
     FROM users
     WHERE full_name ILIKE $1
     ORDER BY total_xp DESC
     LIMIT 20`,
    [`%${q}%`]
  );
  return result.rows;
}

module.exports = {
  getTiers,
  getRankings,
  getMyRank,
  getNearbyRankings,
  getTopUsers,
  awardUserXP,
  getUserXPLog,
  searchUsersByName,
  invalidateLeaderboardCache,
};
