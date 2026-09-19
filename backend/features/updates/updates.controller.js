const updatesService = require('./updates.service');

/**
 * Controller to fetch latest APK build for a channel.
 */
async function getLatest(req, res) {
  try {
    const channel = req.query.channel;
    const clientCode = parseInt(req.query.version_code);

    const updateInfo = await updatesService.getLatestUpdate({
      channel,
      clientCode,
    });

    return res.json(updateInfo);
  } catch (error) {
    console.error('GET /updates/latest error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getLatest,
};
