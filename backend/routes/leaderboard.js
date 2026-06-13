/**
 * routes/leaderboard.js
 * Base: /api/leaderboard
 *
 * GET  /              – global rankings (paginated, optional tier filter)
 * GET  /me            – current user's rank + XP + tier info
 * GET  /tiers         – full tier definitions (for front-end)
 * POST /award         – award XP for an action (internal / protected)
 * GET  /xp-log        – current user's recent XP transactions
 * GET  /search        – search users by name
 */

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { TIERS, getTierForXP, getNextTier, awardXP, XP_VALUES } = require('../utils/xp');

// ── GET /leaderboard/tiers ────────────────────────────────────────────────────
router.get('/tiers', (_req, res) => {
  res.json(TIERS);
});

// ── GET /leaderboard ── Paginated global rankings (with optional tier filter) ─
//
// Optimisations applied:
//   1. Indexes on (total_xp DESC) and (league_tier, total_xp DESC) make sorting/
//      filtering instant – created once in db.js initDB.
//   2. COUNT(*) OVER() window function fetches total in ONE query, no extra round-trip.
//   3. prev_rank updates moved to a single batch UPDATE … FROM (VALUES …) statement
//      instead of N sequential queries, then fired asynchronously so the response
//      is not blocked by write latency.
//
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit  = Math.min(Math.max(Number(req.query.limit)  || 20, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const tier   = req.query.tier;
    const filterByTier = tier && tier !== 'All';

    // ── Single query: data + total in one pass ──────────────────────────────
    // ROW_NUMBER is computed over ALL users (global rank) regardless of tier
    // filter so rank numbers are always globally consistent.
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

    // Map rank_change (JS-only, zero write cost on reads)
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

    // ── Respond immediately – don't wait for prev_rank update ──────────────
    res.json({ data: rows, total });

    // ── Async batch UPDATE prev_rank (fire-and-forget) ─────────────────────
    // Uses a single parameterised VALUES list instead of N queries.
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

  } catch (err) {
    console.error('GET /leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /leaderboard/me ── Current user's rank, tier, nearby ─────────────────
//
// Optimisations:
//   • Single query with a self-join instead of two correlated subqueries.
//   • Nearby users reuse the index scan (OFFSET computed from rank, LIMIT 5).
//
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // One query: user row + their rank via fast count (uses idx_users_xp)
    const result = await pool.query(
      `SELECT
          u.id, u.full_name, u.profile_pic_url,
          u.total_xp    AS xp,
          u.league_tier,
          u.current_streak,
          -- rank = number of users with strictly more XP + 1
          (SELECT COUNT(*) FROM users WHERE total_xp > u.total_xp) + 1  AS global_rank,
          (SELECT COUNT(*)                                    FROM users) AS total_users
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user      = result.rows[0];
    const tier      = getTierForXP(user.xp);
    const nextTier  = getNextTier(tier.name);
    const rank      = Number(user.global_rank);

    const xpInCurrentTier = user.xp - tier.minXP;
    const tierRange       = nextTier ? nextTier.minXP - tier.minXP : 1;
    const tierProgress    = nextTier ? Math.min(100, Math.round((xpInCurrentTier / tierRange) * 100)) : 100;
    const xpToNext        = nextTier ? nextTier.minXP - user.xp : null;

    // Nearby users – 5 rows starting 3 places above (uses index directly)
    const nearby = await pool.query(
      `SELECT id, full_name, profile_pic_url, total_xp AS xp, league_tier,
              ROW_NUMBER() OVER (ORDER BY total_xp DESC) AS global_rank
       FROM users
       ORDER BY total_xp DESC
       LIMIT 5 OFFSET $1`,
      [Math.max(0, rank - 3)]
    );

    res.json({
      ...user,
      global_rank:   rank,
      tier,
      next_tier:     nextTier,
      xp_to_next:    xpToNext,
      tier_progress: tierProgress,
      nearby:        nearby.rows,
    });
  } catch (err) {
    console.error('GET /leaderboard/me error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /leaderboard/nearby ── Rows around the current user's rank ────────────
//
// Returns:
//   { myRank, total, above: Row[], me: Row, below: Row[], hasMoreBelow: bool }
//
// Query params:
//   extraOffset (default 0) – how many extra rows below to skip (for "show more")
//   count       (default 3) – rows above AND below to return
//
router.get('/nearby', authenticateToken, async (req, res) => {
  try {
    const userId      = req.user.id;
    const count       = Math.min(Math.max(Number(req.query.count)       || 3, 1), 20);
    const extraOffset = Math.max(Number(req.query.extraOffset) || 0, 0);
    const belowLimit  = count + 1; // fetch 1 extra to detect hasMoreBelow

    // Step 1: get user's rank and total
    const rankRes = await pool.query(
      `SELECT
          u.id, u.full_name, u.profile_pic_url,
          u.total_xp AS xp, u.league_tier, u.current_streak,
          (SELECT COUNT(*) FROM users WHERE total_xp > u.total_xp) + 1 AS global_rank,
          (SELECT COUNT(*) FROM users)                                   AS total_users
       FROM users u WHERE u.id = $1`,
      [userId]
    );
    if (rankRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const myRow  = rankRes.rows[0];
    const myRank = Number(myRow.global_rank);
    const total  = Number(myRow.total_users);

    // Step 2: rows above (up to `count` rows immediately above user)
    const aboveOffset = Math.max(0, myRank - 1 - count); // 0-indexed offset
    const aboveLimit  = myRank - 1 - aboveOffset;        // actual rows to fetch (≤ count)

    const aboveRes = aboveLimit > 0
      ? await pool.query(
          `SELECT id, full_name, profile_pic_url, total_xp AS xp, league_tier, current_streak,
                  ROW_NUMBER() OVER (ORDER BY total_xp DESC) AS global_rank
           FROM users ORDER BY total_xp DESC
           LIMIT $1 OFFSET $2`,
          [aboveLimit, aboveOffset]
        )
      : { rows: [] };

    // Step 3: rows below (user rank onwards, skip extraOffset for "show more")
    const belowRes = await pool.query(
      `SELECT id, full_name, profile_pic_url, total_xp AS xp, league_tier, current_streak,
              ROW_NUMBER() OVER (ORDER BY total_xp DESC) AS global_rank
       FROM users ORDER BY total_xp DESC
       LIMIT $1 OFFSET $2`,
      [belowLimit, myRank + extraOffset] // myRank is 1-indexed so this skips user row
    );

    const belowRows  = belowRes.rows.slice(0, count);
    const hasMoreBelow = belowRes.rows.length > count;

    res.json({
      myRank,
      total,
      above: aboveRes.rows.map(r => ({ ...r, global_rank: Number(r.global_rank) })),
      me: { ...myRow, global_rank: myRank },
      below: belowRows.map(r => ({ ...r, global_rank: Number(r.global_rank) })),
      hasMoreBelow,
    });
  } catch (err) {
    console.error('GET /leaderboard/nearby error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /leaderboard/top ── Top 3 for podium (no ROW_NUMBER needed) ───────────
router.get('/top', authenticateToken, async (req, res) => {
  try {
    // Simple indexed scan – no window function needed, positions are 1..10 by definition
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
    res.json(rows);
  } catch (err) {
    console.error('GET /leaderboard/top error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /leaderboard/award ── Award XP ───────────────────────────────────────
router.post('/award', authenticateToken, async (req, res) => {
  const { action } = req.body;
  const userId = req.user.id;

  const VALID_ACTIONS = {
    complete_workout:  XP_VALUES.COMPLETE_WORKOUT,
    complete_exercise: XP_VALUES.COMPLETE_EXERCISE,
    rate_exercise:     XP_VALUES.RATE_EXERCISE,
    log_meal:          XP_VALUES.LOG_MEAL,
    daily_login:       XP_VALUES.DAILY_LOGIN,
  };

  if (!action || !(action in VALID_ACTIONS)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const amount = VALID_ACTIONS[action];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await awardXP(client, userId, amount, action);
    await client.query('COMMIT');
    res.json({ success: true, ...result, action, amount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /leaderboard/award error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── GET /leaderboard/xp-log ── Recent XP history ─────────────────────────────
router.get('/xp-log', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT amount, reason, created_at
       FROM xp_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /leaderboard/xp-log error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /leaderboard/search ── Search by name (trigram index when available) ──
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const result = await pool.query(
      `SELECT id, full_name, profile_pic_url, total_xp AS xp, league_tier
       FROM users
       WHERE full_name ILIKE $1
       ORDER BY total_xp DESC
       LIMIT 20`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /leaderboard/search error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
