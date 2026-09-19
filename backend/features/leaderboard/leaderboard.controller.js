const leaderboardService = require('./leaderboard.service');

/**
 * Controller to get tier definitions.
 */
function getTiers(_req, res) {
  return res.json(leaderboardService.getTiers());
}

/**
 * Controller to get paginated global rankings.
 */
async function getRankings(req, res) {
  try {
    const limit  = Math.min(Math.max(Number(req.query.limit)  || 20, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const tier   = req.query.tier || 'All';

    const payload = await leaderboardService.getRankings({ limit, offset, tier });
    return res.json(payload);
  } catch (err) {
    console.error('GET /leaderboard error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get current user rank, tier info, and nearby users.
 */
async function getMyRank(req, res) {
  try {
    const payload = await leaderboardService.getMyRank(req.user.id);
    if (!payload) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(payload);
  } catch (err) {
    console.error('GET /leaderboard/me error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get nearby users around user rank.
 */
async function getNearby(req, res) {
  try {
    const count       = Math.min(Math.max(Number(req.query.count)       || 3, 1), 20);
    const extraOffset = Math.max(Number(req.query.extraOffset) || 0, 0);

    const payload = await leaderboardService.getNearbyRankings(req.user.id, { count, extraOffset });
    if (!payload) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(payload);
  } catch (err) {
    console.error('GET /leaderboard/nearby error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get top 10 podium.
 */
async function getTop(req, res) {
  try {
    const rows = await leaderboardService.getTopUsers();
    return res.json(rows);
  } catch (err) {
    console.error('GET /leaderboard/top error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to award XP.
 */
async function awardXP(req, res) {
  try {
    const { action } = req.body;
    const result = await leaderboardService.awardUserXP(req.user.id, action);
    return res.json(result);
  } catch (err) {
    console.error('POST /leaderboard/award error:', err);
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * Controller to get XP history.
 */
async function getXPLog(req, res) {
  try {
    const rows = await leaderboardService.getUserXPLog(req.user.id);
    return res.json(rows);
  } catch (err) {
    console.error('GET /leaderboard/xp-log error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to search users.
 */
async function searchUsers(req, res) {
  try {
    const rows = await leaderboardService.searchUsersByName(req.query.q);
    return res.json(rows);
  } catch (err) {
    console.error('GET /leaderboard/search error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getTiers,
  getRankings,
  getMyRank,
  getNearby,
  getTop,
  awardXP,
  getXPLog,
  searchUsers,
};
