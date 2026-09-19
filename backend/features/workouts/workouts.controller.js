const workoutsService = require('./workouts.service');

/**
 * Controller to list shared splits.
 */
async function getSharedSplits(req, res) {
  try {
    const data = await workoutsService.getSharedSplits(req.user.id, req.query);
    return res.json(data);
  } catch (err) {
    console.error('Shared Splits Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to get shared split detail.
 */
async function getSharedSplitDetail(req, res) {
  try {
    const data = await workoutsService.getSharedSplitDetail(req.params.id, req.user.id);
    if (!data) {
      return res.status(404).json({ error: 'Shared split not found' });
    }
    return res.json(data);
  } catch (err) {
    console.error('Shared Split Detail Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Controller to clone shared split.
 */
async function cloneSharedSplit(req, res) {
  try {
    const data = await workoutsService.cloneSharedSplit(req.params.id, req.user.id);
    return res.status(201).json(data);
  } catch (err) {
    console.error('Clone shared split error:', err);
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * Controller to get all splits for current user.
 */
async function getUserSplits(req, res) {
  try {
    const data = await workoutsService.getUserSplits(req.user.id);
    return res.json(data);
  } catch (error) {
    console.error('Fetch user splits error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to get single split detail.
 */
async function getSplitDetail(req, res) {
  try {
    const data = await workoutsService.getSplitDetail(req.params.id, req.user.id);
    if (!data) return res.status(404).json({ error: 'Split not found' });
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to AI generate split.
 */
async function generateAiSplit(req, res) {
  try {
    const data = await workoutsService.generateAiSplit(req.user.id, req.body);
    return res.json(data);
  } catch (err) {
    console.error('POST /workouts/splits/ai-generate error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate AI split' });
  }
}

/**
 * Controller to AI refine split.
 */
async function refineAiSplit(req, res) {
  try {
    const data = await workoutsService.refineAiSplit(req.user.id, req.body);
    return res.json(data);
  } catch (err) {
    console.error('POST /workouts/splits/ai-refine error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to refine AI split' });
  }
}

/**
 * Controller to save AI split.
 */
async function saveAiSplit(req, res) {
  try {
    const data = await workoutsService.saveAiSplit(req.user.id, req.body);
    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /workouts/splits/save-ai-split error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to save split' });
  }
}

/**
 * Controller to create split manually.
 */
async function createSplit(req, res) {
  try {
    const split = await workoutsService.createSplit(req.user.id, req.body);
    return res.status(201).json(split);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to update split.
 */
async function updateSplit(req, res) {
  try {
    const split = await workoutsService.updateSplit(req.user.id, req.params.id, req.body);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    return res.json(split);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to delete split.
 */
async function deleteSplit(req, res) {
  try {
    await workoutsService.deleteSplit(req.user.id, req.params.id);
    return res.json({ message: 'Split deleted' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to rate split.
 */
async function rateSplit(req, res) {
  try {
    const data = await workoutsService.rateSplit(req.user.id, parseInt(req.params.id, 10), req.body.rating);
    return res.json(data);
  } catch (err) {
    console.error('Rate split error:', err);
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * Controller to get sessions for a split.
 */
async function getSessionsForSplit(req, res) {
  try {
    const rows = await workoutsService.getSessionsForSplit(req.params.id, req.user.id);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to create session in split.
 */
async function createSession(req, res) {
  try {
    const row = await workoutsService.createSession(req.params.id, req.user.id, req.body);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

/**
 * Controller to update session.
 */
async function updateSession(req, res) {
  try {
    const row = await workoutsService.updateSession(req.params.id, req.user.id, req.body);
    return res.json(row);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

/**
 * Controller to get single session detail.
 */
async function getSessionDetail(req, res) {
  try {
    const row = await workoutsService.getSessionDetail(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Session not found' });
    return res.json(row);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to delete session.
 */
async function deleteSession(req, res) {
  try {
    await workoutsService.deleteSession(req.params.id, req.user.id);
    return res.json({ message: 'Session deleted' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to get exercises for a session.
 */
async function getSessionExercises(req, res) {
  try {
    const rows = await workoutsService.getSessionExercises(req.params.id, req.user.id);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to add exercise to session.
 */
async function addExerciseToSession(req, res) {
  try {
    const row = await workoutsService.addExerciseToSession(req.params.id, req.user.id, req.body);
    return res.status(201).json(row);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

/**
 * Controller to remove exercise from session.
 */
async function deleteExerciseFromSession(req, res) {
  try {
    await workoutsService.deleteExerciseFromSession(req.params.id, req.user.id);
    return res.json({ message: 'Exercise removed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to update exercise within session.
 */
async function updateExerciseInSession(req, res) {
  try {
    const row = await workoutsService.updateExerciseInSession(req.params.id, req.user.id, req.body);
    if (!row) {
      return res.status(404).json({ error: 'Exercise not found or unauthorized' });
    }
    return res.json(row);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to get all unique exercise categories.
 */
async function getUniqueExerciseCategories(_req, res) {
  try {
    const categories = await workoutsService.getUniqueExerciseCategories();
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to get exercises by category.
 */
async function getExercisesByCategory(req, res) {
  const { limit = 20, offset = 0 } = req.query;
  try {
    const rows = await workoutsService.getExercisesByCategory(req.params.category, limit, offset);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Controller to search exercises for workouts.
 */
async function searchExercises(req, res) {
  try {
    const rows = await workoutsService.searchExercises(req.query);
    return res.json(rows);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getSharedSplits,
  getSharedSplitDetail,
  cloneSharedSplit,
  getUserSplits,
  getSplitDetail,
  generateAiSplit,
  refineAiSplit,
  saveAiSplit,
  createSplit,
  updateSplit,
  deleteSplit,
  rateSplit,
  getSessionsForSplit,
  createSession,
  updateSession,
  getSessionDetail,
  deleteSession,
  getSessionExercises,
  addExerciseToSession,
  deleteExerciseFromSession,
  updateExerciseInSession,
  getUniqueExerciseCategories,
  getExercisesByCategory,
  searchExercises,
};
