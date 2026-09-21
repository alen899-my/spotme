'use strict';

const siteImagesService = require('./site-images.service');

// Public — dynamic, no-cache so changes appear immediately. No auth.
async function getPublicMap(_req, res) {
  try {
    const payload = await siteImagesService.getPublicMap();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.json(payload);
  } catch (err) {
    console.error('GET /site-images error:', err);
    return res.status(500).json({ message: 'Failed to load site images' });
  }
}

// Admin — full slot list.
async function listAdmin(_req, res) {
  try {
    const images = await siteImagesService.listSiteImages();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.json({ images });
  } catch (err) {
    console.error('GET /admin/site-images error:', err);
    return res.status(500).json({ message: 'Failed to list site images' });
  }
}

// Admin — replace one slot (multipart field name: "image").
async function replaceSlot(req, res) {
  try {
    const { slug } = req.params;
    const image = await siteImagesService.replaceImage(slug, req.file);
    return res.json({ success: true, image });
  } catch (err) {
    console.error('PUT /admin/site-images error:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Failed to replace image' });
  }
}

// Admin — hard delete (removes R2 object, reverts to local fallback).
async function deleteSlot(req, res) {
  try {
    const { slug } = req.params;
    const image = await siteImagesService.deleteImageHard(slug);
    return res.json({ success: true, image });
  } catch (err) {
    console.error('DELETE /admin/site-images error:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Failed to delete image' });
  }
}

module.exports = { getPublicMap, listAdmin, replaceSlot, deleteSlot };
