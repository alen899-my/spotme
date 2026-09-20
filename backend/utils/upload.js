const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
  },
});

const upload = multer({
  limits: {
    fileSize: 600 * 1024 * 1024, // 600 MB
    fieldSize: 50 * 1024 * 1024,
  },
  storage: multerS3({
    s3: s3,
    bucket: process.env.CLOUDFLARE_R2_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const ext = file.originalname.split('.').pop() || 'jpg';
      // Dynamically set folder based on route
      const folder = req.originalUrl.includes('/physique') ? 'physique'
                   : req.originalUrl.includes('/daily') ? 'daily'
                   : req.originalUrl.includes('/meals') ? 'meals'
                   : req.originalUrl.includes('/builds') ? 'builds'
                   : req.originalUrl.includes('/file-replacer') ? 'file-replacer'
                   : req.originalUrl.includes('/exercises') ? 'exercises'
                   : req.originalUrl.includes('/categories') ? 'categories'
                   : req.originalUrl.includes('/body_parts') ? 'body_parts'
                   : req.originalUrl.includes('/equipment') ? 'equipment'
                   : req.originalUrl.includes('/targets') ? 'targets'
                   : req.originalUrl.includes('/muscle_groups') ? 'muscle_groups'
                    : req.originalUrl.includes('/secondary_muscles') ? 'secondary_muscles'
                    : req.originalUrl.includes('/site-images') ? 'site-images'
                    : 'onboarding';
      cb(null, `spotme/${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`);
    }
  })
});

module.exports = upload;
module.exports.s3 = s3;
