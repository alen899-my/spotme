const fileReplacerService = require('./file-replacer.service');

/**
 * Controller to upload a frame.
 */
async function uploadFrame(req, res) {
  try {
    const { id } = req.params;
    const reset = req.query.reset === 'true';

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await fileReplacerService.uploadFrame(id, req.file.buffer, reset);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Upload frame error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to delete a frame by index.
 */
async function deleteFrame(req, res) {
  try {
    const { id, index } = req.params;
    const idx = parseInt(index);

    const frames = await fileReplacerService.deleteFrame(id, idx);
    if (!frames) {
      return res.status(400).json({ message: 'Invalid frame index' });
    }
    return res.json({ success: true, frames });
  } catch (error) {
    console.error('Delete frame error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to reorder frames.
 */
async function reorderFrames(req, res) {
  try {
    const { id } = req.params;
    const { frameUrls } = req.body;

    if (!Array.isArray(frameUrls)) {
      return res.status(400).json({ message: 'frameUrls must be an array' });
    }

    await fileReplacerService.reorderFrames(id, frameUrls);
    return res.json({ success: true, frames: frameUrls });
  } catch (error) {
    console.error('Reorder frames error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to upload reference image.
 */
async function uploadReference(req, res) {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const url = await fileReplacerService.uploadReferenceImage(id, req.file.key);
    return res.json({ success: true, url });
  } catch (error) {
    console.error('Upload reference error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to generate animated GIF.
 */
async function generateGif(req, res) {
  try {
    const { id } = req.params;
    const result = await fileReplacerService.generateGif(id, req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Generate GIF error:', error);
    return res.status(error.status || 500).json({ message: error.message || 'Server error' });
  }
}

/**
 * Controller to replace media with uploaded GIF.
 */
async function replaceMedia(req, res) {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No GIF file uploaded' });

    const exercise = await fileReplacerService.replaceMedia(id, req.file.key);
    return res.json({ success: true, exercise });
  } catch (error) {
    console.error('Replace media error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to get status for single exercise.
 */
async function getStatus(req, res) {
  try {
    const status = await fileReplacerService.getReplacerStatus(req.params.id);
    return res.json(status);
  } catch (error) {
    console.error('Get status error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to get bulk status.
 */
async function getBulkStatus(req, res) {
  try {
    const ids = req.query.ids ? req.query.ids.split(',') : [];
    const statusMap = await fileReplacerService.getBulkReplacerStatus(ids);
    return res.json(statusMap);
  } catch (error) {
    console.error('Get bulk status error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to get GIF settings.
 */
async function getGifSettings(_req, res) {
  try {
    const settings = await fileReplacerService.getGifSettings();
    return res.json(settings);
  } catch (error) {
    console.error('Get GIF settings error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Controller to update GIF settings.
 */
async function updateGifSettings(req, res) {
  try {
    const settings = await fileReplacerService.updateGifSettings(req.body);
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Update GIF settings error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  uploadFrame,
  deleteFrame,
  reorderFrames,
  uploadReference,
  generateGif,
  replaceMedia,
  getStatus,
  getBulkStatus,
  getGifSettings,
  updateGifSettings,
};
