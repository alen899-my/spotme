const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../../db');
const updatesController = require('./updates.controller');

const router = express.Router();

/**
 * Optional authentication middleware:
 * If an Authorization header is present, it validates the token and updates `last_active_at`.
 * If no token is provided, it permits the request to continue unauthenticated (e.g. public landing page).
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    pool.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [decoded.id]).catch(() => {});
  } catch (err) {
    // Gracefully proceed if token is expired or invalid for optional routes
  }
  next();
};

router.get('/latest', optionalAuth, updatesController.getLatest);

module.exports = router;
