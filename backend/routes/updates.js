const express = require('express');
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const BUILD_CHANNELS = ['production', 'preview', 'development'];

// ── GET /updates/latest — latest installable (APK) build for a channel ───────
// Query: ?channel=production&version_code=1
// Response: { update_available, force_update, build | null }
// - update_available: true when the store has a newer version_code than the caller.
// - force_update: the admin flag on that build (users must install to continue).
// - Authenticated users only (admin uploads stay admin-only); the R2 file_url
//   itself is a public link so the app can download it directly.
router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const channel = BUILD_CHANNELS.includes(req.query.channel)
      ? req.query.channel
      : 'production';
    const clientCode = parseInt(req.query.version_code);

    const result = await pool.query(
      `SELECT id, title, description, build_channel, file_type, version,
              version_code, file_url, file_size, is_latest, force_update, created_at
       FROM app_builds
       WHERE build_channel = $1 AND file_type = 'apk'
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [channel]
    );

    if (result.rows.length === 0) {
      return res.json({ update_available: false, force_update: false, build: null });
    }

    const build = result.rows[0];
    const update_available =
      !Number.isNaN(clientCode) &&
      build.version_code != null &&
      clientCode < parseInt(build.version_code);

    res.json({
      update_available,
      force_update: !!build.force_update,
      build,
    });
  } catch (error) {
    console.error('GET /updates/latest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
