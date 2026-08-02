import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';
import { BusinessError } from '../helpers/error.helper.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = env.upload.maxFileSizeMb * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.upload.dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const imageFileFilter = (req, file, cb) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(new BusinessError(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`), false);
  }
  cb(null, true);
};

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: imageFileFilter,
}).single('avatar');

export const uploadMiddleware = (uploadHandler) => (req, res, next) => {
  uploadHandler(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new BusinessError(`File too large. Max size: ${env.upload.maxFileSizeMb}MB`));
    }
    return next(err);
  });
};
