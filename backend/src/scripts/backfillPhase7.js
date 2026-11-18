import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Medicine from '../models/Medicine.js';
import Donation from '../models/Donation.js';
import Claim from '../models/Claim.js';
import Transfer from '../models/Transfer.js';
import CustodyEvent from '../models/CustodyEvent.js';
import {
  MEDICINE_STATUS,
  CLAIM_STATUS,
  TRANSFER_STATUS,
  CUSTODY_EVENT_TYPES,
  ROLES,
} from '../config/constants.js';
import { recordEvent } from '../services/custody.service.js';
import { createTransferForClaim } from '../services/transfer.service.js';

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not defined.');
      process.exit(1);
    }

    console.log('🔗 Connecting to database for Phase 7 backfill...');
    await mongoose.connect(mongoUri);

    // 1. Backfill Medicine.qr for all approved/transferred medicines
    console.log('\n📦 Step 1: Checking approved medicines missing QR identifiers...');
    const approvedMeds = await Medicine.find({
      status: { $in: [MEDICINE_STATUS.APPROVED, MEDICINE_STATUS.RESERVED, MEDICINE_STATUS.TRANSFERRED] },
      $or: [{ 'qr.identifier': { $exists: false } }, { 'qr.identifier': null }],
    });

    console.log(`Found ${approvedMeds.length} medicine(s) needing QR metadata.`);
    for (const med of approvedMeds) {
      med.qr = {
        identifier: med.medicineId,
        issuedAt: med.updatedAt || new Date(),
      };
      await med.save();
    }
    console.log(`✅ Backfilled QR metadata for ${approvedMeds.length} medicine(s).`);

    // 2. Backfill Custody Events for medicines with missing chains
    console.log('\n⛓️ Step 2: Checking medicines missing custody event chains...');
    const allMeds = await Medicine.find().sort({ createdAt: 1 });
    let backfilledEventsCount = 0;

    for (const med of allMeds) {
      if (!med.medicineId) {
        med.medicineId = `MED-BF-${String(med._id).slice(-6).toUpperCase()}`;
        await med.save();
      }

      const existingEvents = await CustodyEvent.countDocuments({ medicineId: med._id });
      if (existingEvents > 0) continue;

      const donation = await Donation.findById(med.donationId);

      // Event 1: SUBMITTED
      await recordEvent({
        medicineId: med._id,
        eventType: CUSTODY_EVENT_TYPES.SUBMITTED,
        actorId: med.donorId,
        actorRole: ROLES.DONOR,
        timestamp: donation?.submittedAt || med.createdAt,
        data: {
          donationCode: donation?.donationCode || 'DON-BACKFILL',
          quantity: med.quantity,
          unit: med.unit,
        },
      });
      backfilledEventsCount++;

      // Event 2: AUTO_SCREENED
      const passed = med.screening?.status === 'passed' || med.status !== MEDICINE_STATUS.REJECTED;
      await recordEvent({
        medicineId: med._id,
        eventType: CUSTODY_EVENT_TYPES.AUTO_SCREENED,
        actorId: null,
        actorRole: 'system',
        timestamp: donation?.submittedAt || med.createdAt,
        data: {
          result: passed ? 'passed' : 'rejected',
          reasons: (med.screening?.reasons || []).map((r) => r.code || r),
        },
      });
      backfilledEventsCount++;

      // Event 3: Pharmacist decision
      if ([MEDICINE_STATUS.APPROVED, MEDICINE_STATUS.RESERVED, MEDICINE_STATUS.TRANSFERRED].includes(med.status)) {
        await recordEvent({
          medicineId: med._id,
          eventType: CUSTODY_EVENT_TYPES.PHARMACIST_APPROVED,
          actorId: null,
          actorRole: ROLES.PHARMACIST,
          timestamp: med.updatedAt || new Date(),
          data: {
            notes: 'Approved during pharmacist verification (historical backfill)',
          },
        });
        backfilledEventsCount++;

        await recordEvent({
          medicineId: med._id,
          eventType: CUSTODY_EVENT_TYPES.QR_ISSUED,
          actorId: null,
          actorRole: ROLES.PHARMACIST,
          timestamp: med.qr?.issuedAt || med.updatedAt || new Date(),
          data: {
            qrIdentifier: med.medicineId,
          },
        });
        backfilledEventsCount++;
      } else if (med.status === MEDICINE_STATUS.REJECTED && med.rejectionSource === 'pharmacist') {
        await recordEvent({
          medicineId: med._id,
          eventType: CUSTODY_EVENT_TYPES.PHARMACIST_REJECTED,
          actorId: null,
          actorRole: ROLES.PHARMACIST,
          timestamp: med.updatedAt || new Date(),
          data: {
            reason: med.rejectionReasonText || 'Rejected during verification',
          },
        });
        backfilledEventsCount++;
      }
    }
    console.log(`✅ Backfilled ${backfilledEventsCount} custody event(s).`);

    // 3. Backfill Transfers for accepted/completed claims
    console.log('\n🚚 Step 3: Checking accepted claims without transfers...');
    const acceptedClaims = await Claim.find({
      status: { $in: [CLAIM_STATUS.ACCEPTED, CLAIM_STATUS.COMPLETED] },
    });

    let transfersCreated = 0;
    for (const claim of acceptedClaims) {
      const existing = await Transfer.findOne({ claimId: claim._id });
      if (!existing) {
        await createTransferForClaim(claim);
        transfersCreated++;
      }
    }
    console.log(`✅ Backfilled ${transfersCreated} transfer(s) for accepted claims.`);

    console.log('\n🎉 Phase 7 backfill completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
