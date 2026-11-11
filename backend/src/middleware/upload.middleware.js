import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import ApiError from '../utils/ApiError.js';

/**
 * Multer configuration for file uploads.
 * - Stores files locally in ./uploads
 * - 5MB file size limit
 * - Accepts only jpg, png, and pdf files
 * - Generates safe, unique filenames
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    // Generate safe, unique filename: timestamp-randomhex.ext
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File filter: only allow jpg, png, and pdf
const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPG, PNG, and PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export default upload;

