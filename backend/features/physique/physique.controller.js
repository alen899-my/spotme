const physiqueService = require('./physique.service');

/**
 * Controller to list all active analyses for current user.
 */
async function getPhysiqueAnalyses(req, res) {
  try {
    const data = await physiqueService.getUserPhysiqueAnalyses(req.user.id);
    return res.json(data);
  } catch (err) {
    console.error('GET /physique error:', err);
    return res.status(500).json({ error: 'Failed to fetch analyses' });
  }
}

/**
 * Controller to upload photo + run AI physique analysis.
 */
async function analyzePhoto(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const data = await physiqueService.analyzePhysiquePhoto(req.user.id, req.file.key);
    return res.json(data);
  } catch (err) {
    console.error('POST /physique/analyze error:', err);
    if (err.status === 429 || err.message?.includes('Daily limit reached')) {
      return res.status(429).json({
        error: err.message,
        limitReached: true,
        usedToday: err.usedToday,
        dailyLimit: err.dailyLimit,
      });
    }
    return res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
}

/**
 * Controller to soft-delete an analysis.
 */
async function deletePhysiqueAnalysis(req, res) {
  try {
    const deleted = await physiqueService.softDeletePhysiqueAnalysis(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /physique/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete analysis' });
  }
}

module.exports = {
  getPhysiqueAnalyses,
  analyzePhoto,
  deletePhysiqueAnalysis,
};
