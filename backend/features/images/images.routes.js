const express = require('express');
const router = express.Router();
const imagesController = require('./images.controller');

// Note: authentication (authenticateAdmin) is mounted at app level in server.js:
// app.use('/api/images', authenticateAdmin, imagesRoutes);
router.get('/', imagesController.listImages);
router.delete('/', imagesController.deleteImages);

module.exports = router;
