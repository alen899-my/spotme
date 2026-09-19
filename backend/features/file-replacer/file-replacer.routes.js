const express = require('express');
const router = express.Router();
const multer = require('multer');
const authenticateAdmin = require('../../middleware/adminAuth');
const upload = require('../../utils/upload');
const fileReplacerController = require('./file-replacer.controller');
const fileReplacerService = require('./file-replacer.service');

const memoryUpload = multer({ storage: multer.memoryStorage() });

router.use(authenticateAdmin);
router.use(async (_req, _res, next) => {
  try { await fileReplacerService.ensureTables(); } catch (_) {}
  next();
});

// Upload frame
router.post('/exercises/:id/upload-frame', memoryUpload.single('frame'), fileReplacerController.uploadFrame);

// Delete frame by index
router.delete('/exercises/:id/frames/:index', fileReplacerController.deleteFrame);

// Reorder frames
router.put('/exercises/:id/frames/reorder', fileReplacerController.reorderFrames);

// Upload reference image
router.post('/exercises/:id/upload-reference', upload.single('reference'), fileReplacerController.uploadReference);

// Generate GIF
router.post('/exercises/:id/generate-gif', fileReplacerController.generateGif);

// Replace media with uploaded GIF
router.post('/exercises/:id/replace-media', upload.single('gif'), fileReplacerController.replaceMedia);

// Status for single exercise
router.get('/exercises/:id/status', fileReplacerController.getStatus);

// Bulk status
router.get('/status', fileReplacerController.getBulkStatus);

// GIF settings
router.get('/gif-settings', fileReplacerController.getGifSettings);
router.put('/gif-settings', fileReplacerController.updateGifSettings);

module.exports = router;
