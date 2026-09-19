const express = require('express');
const router  = express.Router();
const authenticateToken = require('../../middleware/auth');
const exercisesController = require('./exercises.controller');

// GET /categories
router.get('/categories', exercisesController.getCategories);

// GET /meta/filters — must come before /:id
router.get('/meta/filters', exercisesController.getFiltersMeta);

// GET / — List with filters & pagination
router.get('/', exercisesController.getExercises);

// GET /:id — Single exercise
router.get('/:id', exercisesController.getExerciseById);

// POST / — Create
router.post('/', authenticateToken, exercisesController.createExercise);

// PUT /:id — Update
router.put('/:id', authenticateToken, exercisesController.updateExercise);

// DELETE /:id — Delete
router.delete('/:id', authenticateToken, exercisesController.deleteExercise);

module.exports = router;
