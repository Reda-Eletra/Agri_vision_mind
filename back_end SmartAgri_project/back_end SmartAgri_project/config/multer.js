const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mimeFallback = {
      'image/jpeg': '.jpg',
      'image/pjpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/x-png': '.png',
      'image/webp': '.webp',
    }[String(file.mimetype || '').toLowerCase()];
    cb(null, `${uuidv4()}${ext || mimeFallback || '.jpg'}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = new Set(['.jpeg', '.jpg', '.jfif', '.pjpeg', '.png', '.webp']);
  const allowedMimeTypes = new Set(['image/jpeg', 'image/pjpeg', 'image/jpg', 'image/png', 'image/x-png', 'image/webp']);
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeType = String(file.mimetype || '').toLowerCase();
  const isValid = allowedExtensions.has(ext) || allowedMimeTypes.has(mimeType);
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = upload;
module.exports.uploadDir = uploadDir;
