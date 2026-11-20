import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import sharp from 'sharp';
import env from '../config/env.js';

// Base directory for local uploads
const UPLOADS_BASE_DIR = path.resolve('uploads', 'org-docs');
const UPLOADS_MEDICINE_BASE_DIR = path.resolve('uploads', 'medicine-photos');

/**
 * Ensure directory exists on local filesystem
 */
const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

/**
 * Process image files (strip EXIF/GPS, auto-rotate, resize max 1600px, compress)
 * Leaves PDFs untouched.
 */
export const processUploadBuffer = async (buffer, mimeType) => {
  if (!buffer) return { buffer, mimeType, size: 0 };

  const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(
    mimeType?.toLowerCase()
  );

  if (!isImage) {
    return { buffer, mimeType, size: buffer.length };
  }

  try {
    const processed = await sharp(buffer)
      .rotate() // Auto-orient then strip EXIF (clears GPS metadata)
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    return {
      buffer: processed,
      mimeType: 'image/jpeg',
      size: processed.length,
    };
  } catch (err) {
    // If sharp fails (e.g. corrupted header), return original buffer
    return { buffer, mimeType, size: buffer.length };
  }
};

/**
 * Get GridFS Bucket instance
 */
export const getGridFSBucket = () => {
  if (!mongoose.connection?.db) {
    throw new Error('Database not connected; GridFS bucket unavailable');
  }
  return new GridFSBucket(mongoose.connection.db, { bucketName: 'medibridge_files' });
};

/**
 * Validate and sanitize local path components
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

const getSafeMedicinePhotoPath = (donationId, itemId, storedName = null) => {
  const sanitizedDonationId = String(donationId).replace(/[^a-zA-Z0-9_-]/g, '');
  const sanitizedItemId = String(itemId).replace(/[^a-zA-Z0-9_-]/g, '');
  const targetDir = path.join(UPLOADS_MEDICINE_BASE_DIR, sanitizedDonationId, sanitizedItemId);

  let targetFile = null;
  let sanitizedStoredName = null;
  if (storedName) {
    sanitizedStoredName = path.basename(storedName);
    targetFile = path.join(targetDir, sanitizedStoredName);
    if (!targetFile.startsWith(UPLOADS_MEDICINE_BASE_DIR)) {
      throw new Error('Invalid file path traversal attempt');
    }
  }

  return { targetDir, targetFile, sanitizedStoredName, sanitizedDonationId };
};

// ----------------------------------------------------
// Organization Documents
// ----------------------------------------------------

/**
 * Save an organization document using active STORAGE_DRIVER (local or gridfs)
 */
export const saveFile = async (orgId, file) => {
  let fileBuffer = file.buffer;
  if (!fileBuffer && file.path) {
    fileBuffer = await fs.promises.readFile(file.path);
    await fs.promises.unlink(file.path).catch(() => {});
  }

  const { buffer: processedBuffer, mimeType, size } = await processUploadBuffer(
    fileBuffer,
    file.mimetype
  );

  const ext = mimeType === 'image/jpeg' ? '.jpg' : path.extname(file.originalname).toLowerCase();
  const randomPrefix = crypto.randomBytes(16).toString('hex');
  const storedName = `${Date.now()}-${randomPrefix}${ext}`;

  if (env.STORAGE_DRIVER === 'gridfs') {
    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(storedName, {
      metadata: {
        kind: 'org_doc',
        ownerId: String(orgId),
        mimeType,
        originalName: file.originalname,
      },
    });

    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
      uploadStream.end(processedBuffer);
    });

    return {
      storedName,
      originalName: file.originalname,
      mimeType,
      size,
    };
  }

  // Local Driver
  const { targetDir, targetFile } = getSafeFilePath(orgId, storedName);
  await ensureDir(targetDir);
  await fs.promises.writeFile(targetFile, processedBuffer);

  return {
    storedName,
    originalName: file.originalname,
    mimeType,
    size,
  };
};

/**
 * Read stream for an organization document (supports fallback across drivers)
 */
export const readFileStream = (orgId, storedName) => {
  if (env.STORAGE_DRIVER === 'gridfs' && mongoose.connection?.readyState === 1) {
    const bucket = getGridFSBucket();
    return bucket.openDownloadStreamByName(storedName);
  }

  try {
    const { targetFile } = getSafeFilePath(orgId, storedName);
    if (fs.existsSync(targetFile)) {
      return fs.createReadStream(targetFile);
    }
  } catch {
    // ignore
  }

  // Fallback to GridFS if not on disk but DB connected
  if (mongoose.connection?.readyState === 1) {
    try {
      const bucket = getGridFSBucket();
      return bucket.openDownloadStreamByName(storedName);
    } catch {
      // ignore
    }
  }

  const error = new Error('File not found on storage');
  error.code = 'ENOENT';
  throw error;
};

/**
 * Delete an organization document
 */
export const deleteFile = async (orgId, storedName) => {
  let deleted = false;

  // Try GridFS
  if (mongoose.connection?.readyState === 1) {
    try {
      const bucket = getGridFSBucket();
      const files = await bucket.find({ filename: storedName }).toArray();
      for (const f of files) {
        await bucket.delete(f._id);
        deleted = true;
      }
    } catch {
      // continue
    }
  }

  // Try Local
  try {
    const { targetFile } = getSafeFilePath(orgId, storedName);
    if (fs.existsSync(targetFile)) {
      await fs.promises.unlink(targetFile);
      deleted = true;
    }
  } catch {
    // continue
  }

  return deleted;
};

/**
 * Check if document exists
 */
export const fileExists = async (orgId, storedName) => {
  if (mongoose.connection?.readyState === 1) {
    try {
      const bucket = getGridFSBucket();
      const count = await bucket.find({ filename: storedName }).count();
      if (count > 0) return true;
    } catch {
      // fallback
    }
  }

  try {
    const { targetFile } = getSafeFilePath(orgId, storedName);
    return fs.existsSync(targetFile);
  } catch {
    return false;
  }
};

// ----------------------------------------------------
// Medicine Photos
// ----------------------------------------------------

/**
 * Save medicine photo with sharp optimization
 */
export const saveMedicinePhoto = async (donationId, itemId, file) => {
  let fileBuffer = file.buffer;
  if (!fileBuffer && file.path) {
    fileBuffer = await fs.promises.readFile(file.path);
    await fs.promises.unlink(file.path).catch(() => {});
  }

  const { buffer: processedBuffer, mimeType, size } = await processUploadBuffer(
    fileBuffer,
    file.mimetype
  );

  const ext = mimeType === 'image/jpeg' ? '.jpg' : path.extname(file.originalname).toLowerCase();
  const randomPrefix = crypto.randomBytes(16).toString('hex');
  const storedName = `${Date.now()}-${randomPrefix}${ext}`;

  if (env.STORAGE_DRIVER === 'gridfs') {
    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(storedName, {
      metadata: {
        kind: 'medicine_photo',
        donationId: String(donationId),
        itemId: String(itemId),
        mimeType,
        originalName: file.originalname,
      },
    });

    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
      uploadStream.end(processedBuffer);
    });

    return {
      storedName,
      originalName: file.originalname,
      mimeType,
      size,
    };
  }

  // Local driver
  const { targetDir, targetFile } = getSafeMedicinePhotoPath(donationId, itemId, storedName);
  await ensureDir(targetDir);
  await fs.promises.writeFile(targetFile, processedBuffer);

  return {
    storedName,
    originalName: file.originalname,
    mimeType,
    size,
  };
};

/**
 * Read stream for medicine photo
 */
export const readMedicinePhotoStream = (donationId, itemId, storedName) => {
  if (env.STORAGE_DRIVER === 'gridfs' && mongoose.connection?.readyState === 1) {
    const bucket = getGridFSBucket();
    return bucket.openDownloadStreamByName(storedName);
  }

  try {
    const { targetFile } = getSafeMedicinePhotoPath(donationId, itemId, storedName);
    if (fs.existsSync(targetFile)) {
      return fs.createReadStream(targetFile);
    }
  } catch {
    // ignore
  }

  // Fallback to GridFS
  if (mongoose.connection?.readyState === 1) {
    try {
      const bucket = getGridFSBucket();
      return bucket.openDownloadStreamByName(storedName);
    } catch {
      // ignore
    }
  }

  const error = new Error('Medicine photo not found on storage');
  error.code = 'ENOENT';
  throw error;
};

/**
 * Delete medicine photo
 */
export const deleteMedicinePhoto = async (donationId, itemId, storedName) => {
  let deleted = false;

  if (mongoose.connection?.readyState === 1) {
    try {
      const bucket = getGridFSBucket();
      const files = await bucket.find({ filename: storedName }).toArray();
      for (const f of files) {
        await bucket.delete(f._id);
        deleted = true;
      }
    } catch {
      // ignore
    }
  }

  try {
    const { targetFile } = getSafeMedicinePhotoPath(donationId, itemId, storedName);
    if (fs.existsSync(targetFile)) {
      await fs.promises.unlink(targetFile);
      deleted = true;
    }
  } catch {
    // ignore
  }

  return deleted;
};

/**
 * Delete all photos for a donation
 */
export const deleteDonationPhotos = async (donationId) => {
  let deleted = false;

  if (mongoose.connection?.readyState === 1) {
    try {
      const bucket = getGridFSBucket();
      const files = await bucket
        .find({ 'metadata.donationId': String(donationId) })
        .toArray();
      for (const f of files) {
        await bucket.delete(f._id);
        deleted = true;
      }
    } catch {
      // ignore
    }
  }

  try {
    const sanitizedDonationId = String(donationId).replace(/[^a-zA-Z0-9_-]/g, '');
    const donationDir = path.join(UPLOADS_MEDICINE_BASE_DIR, sanitizedDonationId);
    if (fs.existsSync(donationDir)) {
      await fs.promises.rm(donationDir, { recursive: true, force: true });
      deleted = true;
    }
  } catch {
    // ignore
  }

  return deleted;
};

export default {
  processUploadBuffer,
  getGridFSBucket,
  saveFile,
  readFileStream,
  deleteFile,
  fileExists,
  saveMedicinePhoto,
  readMedicinePhotoStream,
  deleteMedicinePhoto,
  deleteDonationPhotos,
};
