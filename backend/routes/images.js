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
  meals: 'Meals',
  onboarding: 'Onboarding',
};

// GET / – List ALL images grouped by folder (no pagination — metadata only)
router.get('/', async (_req, res) => {
  try {
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

    const order = ['exercises', 'categories', 'body_parts', 'equipment', 'targets', 'muscle_groups', 'secondary_muscles', 'physique', 'daily', 'meals', 'onboarding'];

    const folders = Object.entries(folderMap)
      .sort(([a], [b]) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .map(([name, images]) => ({
        name,
        displayName: FOLDER_LABELS[name] || name,
        count: images.length,
        images: images.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified)),
      }));

    res.json({ folders });
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
