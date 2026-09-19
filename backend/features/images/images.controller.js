const imagesService = require('./images.service');

/**
 * Controller to list all images grouped by folder.
 */
async function listImages(_req, res) {
  try {
    const data = await imagesService.listAllImagesGrouped();
    return res.json(data);
  } catch (err) {
    console.error('GET /images error:', err);
    return res.status(500).json({ message: 'Failed to list images' });
  }
}

/**
 * Controller to batch delete images.
 */
async function deleteImages(req, res) {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ message: 'keys array is required' });
    }

    const result = await imagesService.deleteImages(keys);
    return res.json(result);
  } catch (err) {
    console.error('DELETE /images error:', err);
    return res.status(500).json({ message: 'Failed to delete images' });
  }
}

module.exports = {
  listImages,
  deleteImages,
};
