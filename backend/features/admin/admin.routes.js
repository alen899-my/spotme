'use strict';

const express = require('express');
const router = express.Router();

const adminController = require('./admin.controller');
const authenticateAdmin = require('../../middleware/adminAuth');
const upload = require('../../utils/upload');
const { validate, schemas } = require('../../middleware/validate');

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/login', adminController.login);
router.get('/me', authenticateAdmin, adminController.getMe);
router.get('/dashboard', authenticateAdmin, adminController.getDashboard);

// ─── User CRUD ────────────────────────────────────────────────────────────────
router.get('/users', authenticateAdmin, adminController.listUsers);
router.get('/users/:id', authenticateAdmin, adminController.getUser);
router.put('/users/:id', authenticateAdmin, adminController.updateUser);
router.delete('/users/:id', authenticateAdmin, adminController.deleteUser);

// ─── Feedback CRUD ────────────────────────────────────────────────────────────
router.get('/feedback', authenticateAdmin, adminController.listFeedback);
router.delete('/feedback/:id', authenticateAdmin, adminController.deleteFeedback);

// ─── Active Users ─────────────────────────────────────────────────────────────
router.get('/active-users', authenticateAdmin, adminController.getActiveUsers);

// ─── Exercise CRUD ────────────────────────────────────────────────────────────
router.post(
  '/exercises',
  authenticateAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gif', maxCount: 1 },
  ]),
  validate(schemas.createExercise),
  adminController.createExercise
);

router.put(
  '/exercises/:id',
  authenticateAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gif', maxCount: 1 },
  ]),
  adminController.updateExercise
);

// ─── Workout Split CRUD (admin templates) ────────────────────────────────────
router.get('/splits', authenticateAdmin, adminController.listSplits);
router.get('/splits/:id', authenticateAdmin, adminController.getSplit);
router.post('/splits', authenticateAdmin, adminController.createSplit);
router.put('/splits/:id', authenticateAdmin, adminController.updateSplit);
router.delete('/splits/:id', authenticateAdmin, adminController.deleteSplit);

// ─── Entity Library CRUD ──────────────────────────────────────────────────────
const entityNameMap = {
  categories: 'categories',
  body_parts: 'body-parts',
  equipment: 'equipment',
  targets: 'targets',
  muscle_groups: 'muscle-groups',
  secondary_muscles: 'secondary-muscles',
};

for (const [table, entityName] of Object.entries(entityNameMap)) {
  router.get(`/${entityName}`, authenticateAdmin, adminController.makeListEntityHandler(table, entityName));
  router.get(`/${entityName}/:id`, authenticateAdmin, adminController.makeGetEntityHandler(table, entityName));
  router.post(`/${entityName}`, authenticateAdmin, upload.single('image'), adminController.makeCreateEntityHandler(table, entityName));
  router.put(`/${entityName}/:id`, authenticateAdmin, upload.single('image'), adminController.makeUpdateEntityHandler(table, entityName));
  router.delete(`/${entityName}/:id`, authenticateAdmin, adminController.makeDeleteEntityHandler(table, entityName));
}

// ─── App Builds ───────────────────────────────────────────────────────────────
router.get('/builds', authenticateAdmin, adminController.listBuilds);
router.get('/builds/:id', authenticateAdmin, adminController.getBuild);
router.post('/builds', authenticateAdmin, upload.single('build_file'), adminController.createBuild);
router.put('/builds/:id', authenticateAdmin, upload.single('build_file'), adminController.updateBuild);
router.delete('/builds/:id', authenticateAdmin, adminController.deleteBuild);

module.exports = router;
