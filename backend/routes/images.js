const express = require('express');
const router = express.Router();
const { s3 } = require('../uploadConfig');
const { paginateListObjectsV2, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

const FOLDER_LABELS = {
  exercises: 'Exercises',
  categories: 'Categories',
  body_parts: 'Body Parts',
  equipment: 'Equipment',
  targets: 'Targets',
  muscle_groups: 'Muscle Groups',
  secondary_muscles: 'Secondary Muscles',
  physique: 'Physique Photos',
  daily: 'Daily Workouts',
  onboarding: 'Onboarding',
};

// GET / – List images grouped by folder
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 60 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    const allObjects = [];

    const paginator = paginateListObjectsV2(
      { client: s3 },
      { Bucket: process.env.CLOUDFLARE_R2_BUCKET, Prefix: 'spotme/' }
    );

    for await (const pageData of paginator) {
      for (const obj of (pageData.Contents || [])) {
        if (obj.Key.endsWith('/')) continue;
        allObjects.push(obj);
      }
    }

    // Group by folder
    const folderMap = {};
    for (const obj of allObjects) {
      const parts = obj.Key.split('/');
      const folder = parts.length >= 2 ? parts[1] : 'other';
      if (!folderMap[folder]) folderMap[folder] = [];
      folderMap[folder].push({
        key: obj.Key,
        url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${obj.Key}`,
        lastModified: obj.LastModified,
        size: obj.Size,
      });
    }

    // Sort folders and their images
    const folderEntries = Object.entries(folderMap).sort(([a], [b]) => {
      const order = ['exercises', 'categories', 'body_parts', 'equipment', 'targets', 'muscle_groups', 'secondary_muscles', 'physique', 'daily', 'onboarding'];
      return order.indexOf(a) - order.indexOf(b);
    });

    // Build flat list with folder context for pagination
    const flatImages = [];
    const folderSummary = [];
    for (const [name, images] of folderEntries) {
      images.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      folderSummary.push({ name, displayName: FOLDER_LABELS[name] || name, count: images.length });
      for (const img of images) {
        flatImages.push({ ...img, folder: name });
      }
    }

    const total = flatImages.length;
    const totalPages = Math.ceil(total / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paginatedImages = flatImages.slice(start, start + limitNum);

    // Re-group paginated images by folder
    const paginatedFolderMap = {};
    for (const img of paginatedImages) {
      if (!paginatedFolderMap[img.folder]) paginatedFolderMap[img.folder] = [];
      paginatedFolderMap[img.folder].push(img);
    }

    const paginatedFolders = folderSummary
      .filter(f => paginatedFolderMap[f.name])
      .map(f => ({
        ...f,
        images: paginatedFolderMap[f.name],
      }));

    res.json({
      folders: paginatedFolders,
      allFolders: folderSummary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('GET /images error:', err);
    res.status(500).json({ message: 'Failed to list images' });
  }
});

// DELETE / – Batch delete images from R2
router.delete('/', async (req, res) => {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ message: 'keys array is required' });
    }

    const command = new DeleteObjectsCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: true,
      },
    });

    const result = await s3.send(command);

    res.json({
      deleted: result.Deleted?.length || 0,
      errors: result.Errors || [],
    });
  } catch (err) {
    console.error('DELETE /images error:', err);
    res.status(500).json({ message: 'Failed to delete images' });
  }
});

module.exports = router;
