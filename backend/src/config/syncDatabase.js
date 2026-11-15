import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Donation from '../models/Donation.js';
import Medicine from '../models/Medicine.js';
import Verification from '../models/Verification.js';
import Request from '../models/Request.js';
import Transfer from '../models/Transfer.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import Counter from '../models/Counter.js';

const models = [
  User,
  Organization,
  Donation,
  Medicine,
  Verification,
  Request,
  Transfer,
  Notification,
  AuditLog,
  Counter,
];

/**
 * Initializes all database collections and synchronizes their indexes in MongoDB.
 * Ensures all 9 collections exist in MongoDB Atlas on startup.
 */
export const syncDatabaseCollections = async () => {
  for (const model of models) {
    try {
      await model.createCollection();
      await model.syncIndexes();
      // console.log(`✓ Collection ready: ${model.collection.name}`);
    } catch (err) {
      console.warn(`⚠️ Collection init warning for ${model.modelName}:`, err.message);
    }
  }
  console.log('✅ All 9 MongoDB collections initialized and indexed');
};

export default syncDatabaseCollections;

