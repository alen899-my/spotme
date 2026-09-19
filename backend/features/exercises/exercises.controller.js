const exercisesService = require('./exercises.service');

/**
 * Controller to get categories with image & count.
 */
async function getCategories(_req, res) {
  try {
    const categories = await exercisesService.getCategories();
    return res.json(categories);
  } catch (err) {
    console.error('GET /exercises/categories error:', err);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

/**
 * Controller to get filter dropdown metadata.
 */
async function getFiltersMeta(req, res) {
  try {
    const { category, equipment } = req.query;
    const meta = await exercisesService.getFiltersMeta({ category, equipment });
    return res.json(meta);
  } catch (err) {
    console.error('GET /exercises/meta/filters error:', err);
    return res.status(500).json({ error: 'Failed to fetch filter metadata' });
  }
}

/**
 * Controller to list exercises with filters & pagination.
 */
async function getExercises(req, res) {
  try {
    const result = await exercisesService.getExercises(req.query);
    return res.json(result);
  } catch (err) {
    console.error('GET /exercises error:', err);
    return res.status(500).json({ error: 'Failed to fetch exercises' });
  }
}

/**
 * Controller to get single exercise by ID.
 */
async function getExerciseById(req, res) {
  try {
    const exercise = await exercisesService.getExerciseById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    return res.json(exercise);
  } catch (err) {
    console.error('GET /exercises/:id error:', err);
    return res.status(500).json({ error: 'Failed to fetch exercise' });
  }
}

/**
 * Controller to create an exercise.
 */
async function createExercise(req, res) {
  try {
    const { id, name } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: 'id and name are required' });
    }

    const exercise = await exercisesService.createExercise(req.body);
    return res.status(201).json({ success: true, exercise });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Exercise with this id already exists' });
    }
    console.error('POST /exercises error:', err);
    return res.status(500).json({ error: 'Failed to create exercise' });
  }
}

/**
 * Controller to update an exercise.
 */
async function updateExercise(req, res) {
  try {
    const exercise = await exercisesService.updateExercise(req.params.id, req.body);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    return res.json({ success: true, exercise });
  } catch (err) {
    console.error('PUT /exercises/:id error:', err);
    return res.status(500).json({ error: 'Failed to update exercise' });
  }
}

/**
 * Controller to delete an exercise.
 */
async function deleteExercise(req, res) {
  try {
    const deleted = await exercisesService.deleteExercise(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    return res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    console.error('DELETE /exercises/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete exercise' });
  }
}

module.exports = {
  getCategories,
  getFiltersMeta,
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
};
