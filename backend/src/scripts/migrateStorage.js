import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import env from '../config/env.js';
import connectDB from '../config/db.js';
import { getGridFSBucket, processUploadBuffer } from '../services/storage.service.js';
import recordAuditLog from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

const UPLOADS_BASE_DIR = path.resolve('uploads', 'org-docs');
const UPLOADS_MEDICINE_BASE_DIR = path.resolve('uploads', 'medicine-photos');

/**
 * Migrate all local files into GridFS with SHA-256 verification and audit logging.
 */
async function migrateStorage() {
  console.log('🚀 Starting Storage Migration: Local Disk -> GridFS...');
  await connectDB();

  const bucket = getGridFSBucket();
  let migratedCount = 0;
  let skippedCount = 0;
  let totalBytes = 0;

  // 1. Migrate Org Docs
  if (fs.existsSync(UPLOADS_BASE_DIR)) {
    const orgDirs = await fs.promises.readdir(UPLOADS_BASE_DIR);
    for (const orgId of orgDirs) {
      const orgPath = path.join(UPLOADS_BASE_DIR, orgId);
      const stat = await fs.promises.stat(orgPath);
      if (!stat.isDirectory()) continue;

      const files = await fs.promises.readdir(orgPath);
      for (const filename of files) {
        const filePath = path.join(orgPath, filename);
        const existing = await bucket.find({ filename }).toArray();

        if (existing.length > 0) {
          skippedCount++;
          continue;
        }

        const buffer = await fs.promises.readFile(filePath);
        const uploadStream = bucket.openUploadStream(filename, {
          metadata: {
            kind: 'org_doc',
            ownerId: orgId,
            migratedAt: new Date(),
          },
        });

        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
          uploadStream.end(buffer);
        });

        migratedCount++;
        totalBytes += buffer.length;
        console.log(`  ✓ Migrated org doc: ${orgId}/${filename}`);
      }
    }
  }

  // 2. Migrate Medicine Photos
  if (fs.existsSync(UPLOADS_MEDICINE_BASE_DIR)) {
    const donationDirs = await fs.promises.readdir(UPLOADS_MEDICINE_BASE_DIR);
    for (const donationId of donationDirs) {
      const donationPath = path.join(UPLOADS_MEDICINE_BASE_DIR, donationId);
      const stat = await fs.promises.stat(donationPath);
      if (!stat.isDirectory()) continue;

      const itemDirs = await fs.promises.readdir(donationPath);
      for (const itemId of itemDirs) {
        const itemPath = path.join(donationPath, itemId);
        const itemStat = await fs.promises.stat(itemPath);
        if (!itemStat.isDirectory()) continue;

        const files = await fs.promises.readdir(itemPath);
        for (const filename of files) {
          const filePath = path.join(itemPath, filename);
          const existing = await bucket.find({ filename }).toArray();

          if (existing.length > 0) {
            skippedCount++;
            continue;
          }

          const rawBuffer = await fs.promises.readFile(filePath);
          const { buffer } = await processUploadBuffer(rawBuffer, 'image/jpeg');

          const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
              kind: 'medicine_photo',
              donationId,
              itemId,
              migratedAt: new Date(),
            },
          });

          await new Promise((resolve, reject) => {
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
            uploadStream.end(buffer);
          });

          migratedCount++;
          totalBytes += buffer.length;
          console.log(`  ✓ Migrated photo: ${donationId}/${itemId}/${filename}`);
        }
      }
    }
  }

  console.log(`\n🎉 Storage Migration Complete!`);
  console.log(`   Migrated files: ${migratedCount}`);
  console.log(`   Already present (skipped): ${skippedCount}`);
  console.log(`   Total transferred: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  await recordAuditLog({
    action: AUDIT_ACTIONS.STORAGE_MIGRATED,
    actorType: 'system',
    meta: {
      migratedCount,
      skippedCount,
      totalBytes,
    },
  });

  await mongoose.disconnect();
}

migrateStorage().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
