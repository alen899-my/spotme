const { pool } = require('../../db');

const BUILD_CHANNELS = ['production', 'preview', 'development'];

/**
 * Checks for the latest app build matching channel and version_code.
 */
async function getLatestUpdate({ channel, clientCode }) {
  const selectedChannel = BUILD_CHANNELS.includes(channel) ? channel : 'production';

  const result = await pool.query(
    `SELECT id, title, description, build_channel, file_type, version,
            version_code, file_url, file_size, is_latest, force_update, created_at
     FROM app_builds
     WHERE build_channel = $1 AND file_type = 'apk'
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [selectedChannel]
  );

  if (result.rows.length === 0) {
    return { update_available: false, force_update: false, build: null };
  }

  const build = result.rows[0];
  const update_available =
    !Number.isNaN(clientCode) &&
    build.version_code != null &&
    clientCode < parseInt(build.version_code);

  return {
    update_available,
    force_update: !!build.force_update,
    build,
  };
}

module.exports = {
  BUILD_CHANNELS,
  getLatestUpdate,
};
