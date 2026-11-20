import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Organization from '../models/Organization.js';
import Donation from '../models/Donation.js';
import { getGridFSBucket } from '../services/storage.service.js';

const UPLOADS_BASE_DIR = path.resolve('uploads', 'org-docs');
const UPLOADS_MEDICINE_BASE_DIR = path.resolve('uploads', 'medicine-photos');

/**
 * Scan local disk and GridFS for orphan files not referenced in any DB collection.
 * Usage: node src/scripts/cleanupOrphanFiles.js [--delete]
 */
async function cleanupOrphans() {
  const isDelete = process.argv.includes('--delete');
  console.log(`🔍 Scanning for orphan files (mode: ${isDelete ? 'PURGE' : 'DRY-RUN'})...`);

  await connectDB();

  // 1. Collect all referenced storedNames in DB
  const referencedStoredNames = new Set();

  const orgs = await Organization.find({}).select('documents.storedName').lean();
  for (const org of orgs) {
    for (const doc of org.documents || []) {
      if (doc.storedName) referencedStoredNames.add(doc.storedName);
    }
  }

  const donations = await Donation.find({}).select('items.photos.storedName').lean();
  for (const don of donations) {
    for (const it of don.items || []) {
      for (const ph of it.photos || []) {
        if (ph.storedName) referencedStoredNames.add(ph.storedName);
      }
    }
  }

  console.log(`📊 Total active files referenced in MongoDB: ${referencedStoredNames.size}`);

  let orphanCount = 0;
  let orphanBytes = 0;

  // 2. Scan Local Org Docs
  if (fs.existsSync(UPLOADS_BASE_DIR)) {
    const orgDirs = await fs.promises.readdir(UPLOADS_BASE_DIR);
    for (const orgId of orgDirs) {
      const orgPath = path.join(UPLOADS_BASE_DIR, orgId);
      const stat = await fs.promises.stat(orgPath);
      if (!stat.isDirectory()) continue;

      const files = await fs.promises.readdir(orgPath);
      for (const file of files) {
        if (!referencedStoredNames.has(file)) {
          orphanCount++;
          const filePath = path.join(orgPath, file);
          const fStat = await fs.promises.stat(filePath);
          orphanBytes += fStat.size;
          console.log(`  [Orphan Local OrgDoc] ${orgId}/${file}`);
          if (isDelete) {
            await fs.promises.unlink(filePath);
          }
        }
      }
    }
  }

  // 3. Scan Local Medicine Photos
  if (fs.existsSync(UPLOADS_MEDICINE_BASE_DIR)) {
    const donationDirs = await fs.promises.readdir(UPLOADS_MEDICINE_BASE_DIR);
    for (const donId of donationDirs) {
      const donPath = path.join(UPLOADS_MEDICINE_BASE_DIR, donId);
      const stat = await fs.promises.stat(donPath);
      if (!stat.isDirectory()) continue;

      const itemDirs = await fs.promises.readdir(donPath);
      for (const itemId of itemDirs) {
        const itemPath = path.join(donPath, itemId);
        const iStat = await fs.promises.stat(itemPath);
        if (!iStat.isDirectory()) continue;

        const files = await fs.promises.readdir(itemPath);
        for (const file of files) {
          if (!referencedStoredNames.has(file)) {
            orphanCount++;
            const filePath = path.join(itemPath, file);
            const fStat = await fs.promises.stat(filePath);
            orphanBytes += fStat.size;
            console.log(`  [Orphan Local Photo] ${donId}/${itemId}/${file}`);
            if (isDelete) {
              await fs.promises.unlink(filePath);
            }
          }
        }
      }
    }
  }

  // 4. Scan GridFS
  try {
    const bucket = getGridFSBucket();
    const gridFiles = await bucket.find({}).toArray();
    for (const gf of gridFiles) {
      if (!referencedStoredNames.has(gf.filename)) {
        orphanCount++;
        orphanBytes += gf.length;
        console.log(`  [Orphan GridFS] ${gf.filename} (${gf.length} bytes)`);
        if (isDelete) {
          await bucket.delete(gf._id);
        }
      }
    }
  } catch (err) {
    console.warn('GridFS scan notice:', err.message);
  }

  console.log(`\n📋 Orphan Scan Summary:`);
  console.log(`   Found orphans: ${orphanCount}`);
  console.log(`   Wasted storage: ${(orphanBytes / 1024 / 1024).toFixed(2)} MB`);
  if (!isDelete && orphanCount > 0) {
    console.log(`   💡 Run with --delete to permanently remove orphan files.`);
  } else if (isDelete) {
    console.log(`   🧹 All orphan files successfully removed!`);
  }

  await mongoose.disconnect();
}

cleanupOrphans().catch((err) => {
  console.error('❌ Orphan cleanup failed:', err);
  process.exit(1);
});
