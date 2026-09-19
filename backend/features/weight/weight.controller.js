const weightService = require('./weight.service');

/**
 * Controller to log a new weight entry.
 */
async function logWeight(req, res) {
  try {
    const { weight, notes } = req.body;
    if (weight === undefined || weight === null || weight === '' || isNaN(parseFloat(weight))) {
      return res.status(400).json({ error: 'Valid weight is required' });
    }

    const entry = await weightService.logWeight(req.user.id, { weight, notes });
    return res.status(201).json(entry);
  } catch (err) {
    console.error('Error logging weight:', err);
    return res.status(500).json({ error: 'Failed to log weight' });
  }
}

/**
 * Controller to fetch all weight entries for user.
 */
async function getWeightLogs(req, res) {
  try {
    const { limit, range } = req.query;
    const entries = await weightService.getWeightLogs(req.user.id, { limit, range });
    return res.json(entries);
  } catch (err) {
    console.error('Error fetching weight logs:', err);
    return res.status(500).json({ error: 'Failed to fetch weight logs' });
  }
}

/**
 * Controller to delete a weight entry.
 */
async function deleteWeightLog(req, res) {
  try {
    const deleted = await weightService.deleteWeightLog(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Weight entry not found' });
    }
    return res.json({ message: 'Weight entry deleted' });
  } catch (err) {
    console.error('Error deleting weight entry:', err);
    return res.status(500).json({ error: 'Failed to delete weight entry' });
  }
}

module.exports = {
  logWeight,
  getWeightLogs,
  deleteWeightLog,
};
