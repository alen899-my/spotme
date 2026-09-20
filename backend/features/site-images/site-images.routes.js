'use strict';

const express = require('express');
const authenticateAdmin = require('../../middleware/adminAuth');
const upload = require('../../utils/upload');
const controller = require('./site-images.controller');
const service = require('./site-images.service');

// Public router — mounted at GET /api/site-images (no auth, CDN cacheable)
const publicRouter = express.Router();
publicRouter.get('/', controller.getPublicMap);

// Admin router — mounted at /api/admin/site-images (auth required)
const adminRouter = express.Router();
adminRouter.use(authenticateAdmin);
adminRouter.use(async (_req, _res, next) => {
  try { await service.ensureTable(); } catch (_) {}
  next();
});
adminRouter.get('/', controller.listAdmin);
adminRouter.put('/:slug', upload.single('image'), controller.replaceSlot);
adminRouter.delete('/:slug', controller.deleteSlot);

module.exports = { publicRouter, adminRouter };
