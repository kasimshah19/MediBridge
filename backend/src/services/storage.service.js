import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Base directory for organization documents
const UPLOADS_BASE_DIR = path.resolve('uploads', 'org-docs');

/**
 * Ensure directory exists synchronously or asynchronously.
 */
const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

/**
 * Validate and sanitize path components to prevent path traversal.
 */
const getSafeFilePath = (orgId, storedName) => {
  const sanitizedOrgId = String(orgId).replace(/[^a-zA-Z0-9_-]/g, '');
  const sanitizedStoredName = path.basename(storedName);
  const targetDir = path.join(UPLOADS_BASE_DIR, sanitizedOrgId);
  const targetFile = path.join(targetDir, sanitizedStoredName);

  if (!targetFile.startsWith(UPLOADS_BASE_DIR)) {
    throw new Error('Invalid file path traversal attempt');
  }

  return { targetDir, targetFile, sanitizedStoredName };
};

/**
 * Save an uploaded file buffer to the local disk under uploads/org-docs/<orgId>/.
 * Generates a crypto-random filename for storage security.
 *
 * @param {string} orgId - Organization ID
 * @param {object} file - Multer file object ({ originalname, mimetype, size, buffer })
 * @returns {Promise<{ storedName: string, originalName: string, mimeType: string, size: number }>}
 */
export const saveFile = async (orgId, file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const randomPrefix = crypto.randomBytes(16).toString('hex');
  const storedName = `${Date.now()}-${randomPrefix}${ext}`;

  const { targetDir, targetFile } = getSafeFilePath(orgId, storedName);
  await ensureDir(targetDir);

  if (file.buffer) {
    await fs.promises.writeFile(targetFile, file.buffer);
  } else if (file.path) {
    // If stored on disk temporarily by multer
    await fs.promises.copyFile(file.path, targetFile);
    await fs.promises.unlink(file.path).catch(() => {});
  } else {
    throw new Error('No file buffer or path provided for storage');
  }

  return {
    storedName,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
};

/**
 * Create a readable stream for the requested document.
 *
 * @param {string} orgId
 * @param {string} storedName
 * @returns {fs.ReadStream}
 */
export const readFileStream = (orgId, storedName) => {
  const { targetFile } = getSafeFilePath(orgId, storedName);

  if (!fs.existsSync(targetFile)) {
    const error = new Error('File not found on storage');
    error.code = 'ENOENT';
    throw error;
  }

  return fs.createReadStream(targetFile);
};

/**
 * Delete a file from disk storage.
 *
 * @param {string} orgId
 * @param {string} storedName
 * @returns {Promise<boolean>}
 */
export const deleteFile = async (orgId, storedName) => {
  try {
    const { targetFile } = getSafeFilePath(orgId, storedName);
    if (fs.existsSync(targetFile)) {
      await fs.promises.unlink(targetFile);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`⚠️ Failed to delete file ${storedName} for org ${orgId}:`, error.message);
    return false;
  }
};

/**
 * Check whether a file exists on disk.
 *
 * @param {string} orgId
 * @param {string} storedName
 * @returns {boolean}
 */
export const fileExists = (orgId, storedName) => {
  try {
    const { targetFile } = getSafeFilePath(orgId, storedName);
    return fs.existsSync(targetFile);
  } catch {
    return false;
  }
};

export default {
  saveFile,
  readFileStream,
  deleteFile,
  fileExists,
};
