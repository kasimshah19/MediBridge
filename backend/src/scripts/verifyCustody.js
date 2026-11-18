import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Medicine from '../models/Medicine.js';
import CustodyEvent from '../models/CustodyEvent.js';
import { verifyChain } from '../services/custody.service.js';

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not defined.');
      process.exit(1);
    }

    console.log('🔗 Connecting to database for custody verification...');
    await mongoose.connect(mongoUri);

    console.log('🔍 Scanning custody event chains in database...');
    const distinctMedicineIds = await CustodyEvent.distinct('medicineId');

    console.log(`📋 Found ${distinctMedicineIds.length} medicine custody chain(s).\n`);

    let validCount = 0;
    let brokenCount = 0;
    const reportRows = [];

    for (const medId of distinctMedicineIds) {
      const med = await Medicine.findById(medId).select('name medicineId batchNumber');
      const verification = await verifyChain(medId);

      const row = {
        'Medicine ID': med?.medicineId || medId.toString(),
        Name: med?.name || 'Unknown',
        Events: verification.totalEvents,
        'Latest Hash': verification.latestHash ? verification.latestHash.substring(0, 16) + '...' : 'NONE',
        Status: verification.valid ? '✅ VERIFIED' : '❌ TAMPERED',
      };

      reportRows.push(row);

      if (verification.valid) {
        validCount++;
      } else {
        brokenCount++;
        console.error(
          `🚨 TAMPERING DETECTED on Medicine ${med?.medicineId || medId} at sequence ${verification.eventSeq}: ${verification.reason}`
        );
      }
    }

    console.table(reportRows);

    console.log('\n══════════════════════════════════════════');
    console.log(`TOTAL CHAINS:    ${distinctMedicineIds.length}`);
    console.log(`VALID CHAINS:    ${validCount}`);
    console.log(`BROKEN CHAINS:   ${brokenCount}`);
    console.log('══════════════════════════════════════════');

    if (brokenCount > 0) {
      console.error(`\n❌ Custody verification failed: ${brokenCount} chain(s) compromised!`);
      await mongoose.disconnect();
      process.exit(1);
    } else {
      console.log('\n✅ All custody chains cryptographically sound.');
      await mongoose.disconnect();
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error verifying custody chains:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
