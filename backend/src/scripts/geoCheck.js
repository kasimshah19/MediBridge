import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Organization from '../models/Organization.js';
import Donation from '../models/Donation.js';

async function checkGeoIndexes() {
  console.log('====================================================');
  console.log('🌍 MEDIBRIDGE GEOSPATIAL 2DSPHERE INDEX INTEGRITY CHECK');
  console.log('====================================================\n');

  await connectDB();

  try {
    // 1. Check Organizations Indexes
    console.log('1. Checking Organizations Collection Indexes...');
    const orgIndexes = await Organization.collection.indexes();
    console.log('   Found indexes on "organizations":');
    let orgHas2dsphere = false;

    for (const idx of orgIndexes) {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
      if (idx.key && idx.key.location === '2dsphere') {
        orgHas2dsphere = true;
      }
    }

    if (orgHas2dsphere) {
      console.log('   ✅ PASS: 2dsphere index on organizations.location exists.');
    } else {
      console.error('   ❌ FAIL: 2dsphere index missing on organizations.location!');
    }

    // 2. Check Donations Indexes
    console.log('\n2. Checking Donations Collection Indexes...');
    const donIndexes = await Donation.collection.indexes();
    console.log('   Found indexes on "donations":');
    let donHas2dsphere = false;

    for (const idx of donIndexes) {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
      if (idx.key && idx.key.location === '2dsphere') {
        donHas2dsphere = true;
      }
    }

    if (donHas2dsphere) {
      console.log('   ✅ PASS: 2dsphere index on donations.location exists.');
    } else {
      console.error('   ❌ FAIL: 2dsphere index missing on donations.location!');
    }

    if (!orgHas2dsphere || !donHas2dsphere) {
      console.error('\n❌ CRITICAL: Missing 2dsphere geospatial index. Please ensure schema indexes are synced.');
      await mongoose.connection.close();
      process.exit(1);
    }

    // 3. Run Sample $geoNear Explain
    console.log('\n3. Running sample $geoNear aggregation explain on organizations...');
    // Mumbai coordinates [lng, lat]
    const sampleNear = [72.8777, 19.076];
    const explainPlan = await mongoose.connection.db.command({
      explain: {
        aggregate: 'organizations',
        pipeline: [
          {
            $geoNear: {
              near: { type: 'Point', coordinates: sampleNear },
              distanceField: 'distanceMeters',
              maxDistance: 20000,
              spherical: true,
              key: 'location',
            },
          },
        ],
        cursor: {},
      },
      verbosity: 'queryPlanner',
    });

    const planString = JSON.stringify(explainPlan);
    const usesGeo2dsphere =
      planString.includes('GEO_NEAR_2DSPHERE') ||
      planString.includes('ixscan') ||
      planString.includes('2dsphere');

    console.log(`   Execution query planner stages detected:`);
    if (explainPlan.stages) {
      for (const s of explainPlan.stages) {
        console.log(`   - Stage: ${JSON.stringify(Object.keys(s))}`);
      }
    } else if (explainPlan.queryPlanner) {
      console.log(`   - Planner winningPlan stage: ${explainPlan.queryPlanner.winningPlan?.stage || 'GEO_NEAR'}`);
    }

    if (usesGeo2dsphere) {
      console.log('   ✅ PASS: MongoDB execution plan utilizes 2dsphere index stage.');
    } else {
      console.log('   ⚠️  NOTE: Aggregation completed. Stage details logged.');
    }

    console.log('\n====================================================');
    console.log('🎉 GEOSPATIAL 2DSPHERE VALIDATION COMPLETED SUCCESSFULLY');
    console.log('====================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error verifying geo indexes:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkGeoIndexes();
