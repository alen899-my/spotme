const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const leaderboardController = require('./leaderboard.controller');
const leaderboardService = require('./leaderboard.service');

// GET /api/leaderboard/tiers
router.get('/tiers', leaderboardController.getTiers);

// GET /api/leaderboard — global rankings
router.get('/', authenticateToken, leaderboardController.getRankings);

// GET /api/leaderboard/me — current user rank + nearby
router.get('/me', authenticateToken, leaderboardController.getMyRank);

// GET /api/leaderboard/nearby — rows around current user
router.get('/nearby', authenticateToken, leaderboardController.getNearby);

// GET /api/leaderboard/top — top 10 podium
router.get('/top', authenticateToken, leaderboardController.getTop);

// POST /api/leaderboard/award — award XP
router.post('/award', authenticateToken, leaderboardController.awardXP);

// GET /api/leaderboard/xp-log — recent XP transactions
router.get('/xp-log', authenticateToken, leaderboardController.getXPLog);

// GET /api/leaderboard/search — search users by name
router.get('/search', authenticateToken, leaderboardController.searchUsers);

module.exports = router;
module.exports.invalidateLeaderboardCache = leaderboardService.invalidateLeaderboardCache;
