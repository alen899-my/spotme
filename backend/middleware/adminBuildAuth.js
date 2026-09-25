'use strict';

const crypto = require('crypto');
const authenticateAdmin = require('./adminAuth');

function timingSafeEqualString(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Authenticates human admins (ADMIN_JWT_SECRET) OR the CI release service
 * token (ADMIN_BUILD_TOKEN). Intentionally scoped: only mount this on the
 * build-ingestion endpoints (presigned-url + create), never on read/update/
 * delete or other admin resources.
 *
 * When ADMIN_BUILD_TOKEN is unset, behaves exactly like authenticateAdmin.
 */
function authenticateAdminOrBuildToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const serviceToken = process.env.ADMIN_BUILD_TOKEN;

  if (serviceToken && token && timingSafeEqualString(token, serviceToken)) {
    req.admin = { role: 'admin', service: 'ci-build' };
    return next();
  }

  // Fall back to the standard human-admin JWT check.
  return authenticateAdmin(req, res, next);
}

module.exports = authenticateAdminOrBuildToken;
