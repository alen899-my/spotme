const { paginateListObjectsV2, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { s3 } = require('../../utils/upload');

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

const FOLDER_ORDER = [
  'exercises',
  'categories',
  'body_parts',
  'equipment',
  'targets',
  'muscle_groups',
  'secondary_muscles',
  'physique',
  'daily',
  'meals',
  'onboarding',
];

/**
 * List all objects in R2 grouped by folder.
 */
async function listAllImagesGrouped() {
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

  const folders = Object.entries(folderMap)
    .sort(([a], [b]) => {
      const ai = FOLDER_ORDER.indexOf(a);
      const bi = FOLDER_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .map(([name, images]) => ({
      name,
      displayName: FOLDER_LABELS[name] || name,
      count: images.length,
      images: images.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified)),
    }));

  return { folders };
}

/**
 * Batch delete objects from R2.
 */
async function deleteImages(keys) {
  const command = new DeleteObjectsCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET,
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
      Quiet: true,
    },
  });

  const result = await s3.send(command);

  return {
    deleted: result.Deleted?.length || 0,
    errors: result.Errors || [],
  };
}

module.exports = {
  FOLDER_LABELS,
  listAllImagesGrouped,
  deleteImages,
};
