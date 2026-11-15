import multer from 'multer';
import path from 'path';
import FileType from 'file-type';
import ApiError from '../utils/ApiError.js';

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

/**
 * In-memory storage so we can inspect magic bytes before persisting to disk storage.
 */
const storage = multer.memoryStorage();

const multerInstance = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new ApiError(400, 'Invalid file extension. Only JPG, PNG, and PDF files are allowed.')
      );
    }
    cb(null, true);
  },
});

/**
 * Middleware to handle single document upload and perform deep content inspection (magic bytes).
 * Ensures that renamed executables or spoofed files are rejected.
 */
export const uploadDocumentMiddleware = (fieldName = 'file') => {
  const uploadSingle = multerInstance.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(400, 'File size exceeds maximum allowed limit of 5MB.'));
          }
          return next(new ApiError(400, `Upload error: ${err.message}`));
        }
        return next(err);
      }

      if (!req.file) {
        return next(new ApiError(400, 'No file uploaded. Please select a document to upload.'));
      }

      try {
        // Deep inspection via magic bytes
        const detectedType = await FileType.fromBuffer(req.file.buffer);

        // If file-type detects something, it must be in our allowed mime types
        // If file-type is undefined (e.g. some flat text/corrupted files) or not allowed, reject
        if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
          return next(
            new ApiError(
              400,
              'Invalid file content. The uploaded file does not match allowed types (JPG, PNG, PDF).'
            )
          );
        }

        // Attach verified mimeType and extension
        req.file.verifiedMimeType = detectedType.mime;
        req.file.verifiedExt = detectedType.ext;

        next();
      } catch (inspectError) {
        return next(new ApiError(400, `Failed to inspect file contents: ${inspectError.message}`));
      }
    });
  };
};

// Allowed MIME types and extensions for photos
const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const photoMulterInstance = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_PHOTO_EXTENSIONS.includes(ext)) {
      return cb(
        new ApiError(400, 'Invalid image extension. Only JPG, PNG, and WebP images are allowed.')
      );
    }
    cb(null, true);
  },
});

/**
 * Middleware to handle single medicine photo upload and perform deep content inspection (magic bytes).
 */
export const uploadPhotoMiddleware = (fieldName = 'photo') => {
  const uploadSingle = photoMulterInstance.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(400, 'File size exceeds maximum allowed limit of 5MB.'));
          }
          return next(new ApiError(400, `Upload error: ${err.message}`));
        }
        return next(err);
      }

      if (!req.file) {
        return next(new ApiError(400, 'No photo uploaded. Please select an image to upload.'));
      }

      try {
        const detectedType = await FileType.fromBuffer(req.file.buffer);

        if (!detectedType || !ALLOWED_PHOTO_MIME_TYPES.includes(detectedType.mime)) {
          return next(
            new ApiError(
              400,
              'Invalid file content. The uploaded file does not match allowed image formats (JPG, PNG, WebP).'
            )
          );
        }

        req.file.verifiedMimeType = detectedType.mime;
        req.file.verifiedExt = detectedType.ext;

        next();
      } catch (inspectError) {
        return next(new ApiError(400, `Failed to inspect photo contents: ${inspectError.message}`));
      }
    });
  };
};

export default {
  uploadDocumentMiddleware,
  uploadPhotoMiddleware,
};
