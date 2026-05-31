/**
 * routes/leaderboard.js
 * Base: /api/leaderboard
 *
 * GET  /              – global rankings (paginated, optional tier filter)
 * GET  /me            – current user's rank + XP + tier info
 * GET  /tiers         – full tier definitions (for front-end)
 * POST /award         – award XP for an action (internal / protected)
 * GET  /xp-log        – current user's recent XP transactions
 */

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const { TIERS, getTierForXP, getNextTier, awardXP, XP_VALUES } = require('../utils/xp');

// ── GET /leaderboard/tiers ─────────────────────────────────────────────────────
router.get('/tiers', (req, res) => {
  res.json(TIERS);
});

// ── GET /leaderboard ── Global rankings ───────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tier, limit = 50, offset = 0 } = req.query;

    let where = '';
    const params = [];
    if (tier && tier !== 'All') {
      where = `WHERE u.league_tier = $1`;
      params.push(tier);
    }

    const limitIdx  = params.length + 1;
    const offsetIdx = params.length + 2;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(
      `SELECT
          u.id,
          u.full_name,
          u.profile_pic_url,
          u.total_xp AS xp,
          u.league_tier,
          u.current_streak,
          ROW_NUMBER() OVER (ORDER BY u.total_xp DESC) AS global_rank
       FROM users u
       ${where}
       ORDER BY u.total_xp DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    // Total count for pagination
    const countWhere = tier && tier !== 'All' ? `WHERE league_tier = $1` : '';
    const countParams = tier && tier !== 'All' ? [tier] : [];
    const countRes = await pool.query(`SELECT COUNT(*) FROM users ${countWhere}`, countParams);

    res.json({
      data:  result.rows,
      total: Number(countRes.rows[0].count),
    });
  } catch (err) {
    console.error('GET /leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /leaderboard/me ── Current user rank ──────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get the user's data + global rank
    const result = await pool.query(
      `SELECT
          u.id, u.full_name, u.profile_pic_url, u.total_xp AS xp, u.league_tier, u.current_streak,
          (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.total_xp > u.total_xp) AS global_rank,
          (SELECT COUNT(*) FROM users) AS total_users
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const tier = getTierForXP(user.xp);
    const nextTier = getNextTier(tier.name);

    // XP to next tier
    const xpToNext = nextTier ? nextTier.minXP - user.xp : null;
    const xpInCurrentTier = user.xp - tier.minXP;
    const tierRange = nextTier ? nextTier.minXP - tier.minXP : 1;
    const tierProgress = nextTier ? Math.min(100, Math.round((xpInCurrentTier / tierRange) * 100)) : 100;

    // Nearby users (rank ±3)
    const rank = Number(user.global_rank);
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
      global_rank: rank,
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

// ── GET /leaderboard/top ── Top 10 for podium ─────────────────────────────────
router.get('/top', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          id, full_name, profile_pic_url, total_xp AS xp, league_tier, current_streak,
          ROW_NUMBER() OVER (ORDER BY total_xp DESC) AS global_rank
       FROM users
       ORDER BY total_xp DESC
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /leaderboard/top error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /leaderboard/award ── Internal XP award endpoint ─────────────────────
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

// ── GET /leaderboard/xp-log ── User's recent XP history ──────────────────────
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

// ── GET /leaderboard/search ── Search users by name ──────────────────────────
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT id, full_name, profile_pic_url, total_xp AS xp, league_tier
       FROM users
       WHERE full_name ILIKE $1
       ORDER BY total_xp DESC
       LIMIT 20`,
      [`%${q.trim()}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /leaderboard/search error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
