import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Donation from '../models/Donation.js';
import Medicine from '../models/Medicine.js';
import Request from '../models/Request.js';
import Claim from '../models/Claim.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import {
  ROLES,
  APPROVAL_STATUS,
  DONATION_STATUS,
  MEDICINE_STATUS,
  ORG_STATUS,
  REQUIREMENT_URGENCY,
  REQUEST_STATUS,
  CLAIM_STATUS,
  CLAIM_INITIATOR,
  AUDIT_ACTIONS,
} from '../config/constants.js';
import {
  haversineKm,
  roundCoordinate,
  scoreMatch,
  normalizeMedicineName,
} from '../utils/geo.js';
import {
  createRequirementSchema,
  checkNonCompliantKeywords,
} from '../validators/matching.validator.js';
import {
  findNearbyOrganizations,
  findAvailableMedicinesNear,
  findNearbyOrganizationsForDonation,
} from '../services/geo.service.js';
import {
  createClaim,
  acceptClaim,
  declineClaim,
  cancelClaim,
  getHandoverDetails,
} from '../services/claim.service.js';
import { runExpiryCheck } from '../services/expiry.service.js';
import { deriveDonationStatus } from '../services/verification.service.js';

async function runPhase6Walkthrough() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('🚀 MEDIBRIDGE PHASE 6: END-TO-END GEO MATCHING & REQUESTS VERIFICATION');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  await connectDB();

  const testSuffix = `walkthrough_${Date.now()}`;
  const createdUserIds = [];
  const createdOrgIds = [];
  const createdDonationIds = [];
  const createdMedIds = [];
  const createdReqIds = [];
  const createdClaimIds = [];

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Seed Coordinates & Users (Donor + 3 Verified NGOs + 1 Pending NGO)
    // -------------------------------------------------------------------------
    console.log('🔹 STEP 1: Seeding Test Users & Organizations at Controlled Distances...');

    // Center: Mumbai Bandra / Kurla [lng, lat]
    const donorCoords = [72.8777, 19.0760];

    // NGO A (~ 1.5 km northeast)
    const ngoACoords = [72.8880, 19.0840];
    const distA = haversineKm(donorCoords, ngoACoords);

    // NGO B (~ 8.5 km south)
    const ngoBCoords = [72.8350, 19.0050];
    const distB = haversineKm(donorCoords, ngoBCoords);

    // NGO C (~ 14.5 km south)
    const ngoCCoords = [72.8300, 18.9500];
    const distC = haversineKm(donorCoords, ngoCCoords);

    // NGO Pending (~ 2.5 km)
    const ngoPendingCoords = [72.8600, 19.0600];

    console.log(`   Donor location: [${donorCoords.join(', ')}]`);
    console.log(`   NGO A calculated distance: ${distA.toFixed(2)} km`);
    console.log(`   NGO B calculated distance: ${distB.toFixed(2)} km`);
    console.log(`   NGO C calculated distance: ${distC.toFixed(2)} km`);

    // Create Donor
    const donor = await User.create({
      name: 'Walkthrough Donor',
      email: `donor_${testSuffix}@example.com`,
      passwordHash: 'dummyhash123',
      role: ROLES.DONOR,
      phone: '9999900001',
      address: '101 Bandra Kurla Complex, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
    });
    createdUserIds.push(donor._id);

    // Create NGO Owners & Orgs
    async function createNgoHelper(name, coords, verificationStatus, phone) {
      const u = await User.create({
        name: `${name} Admin`,
        email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${testSuffix}@ngo.org`,
        passwordHash: 'dummyhash123',
        role: ROLES.NGO,
        phone,
      });
      createdUserIds.push(u._id);

      const org = await Organization.create({
        ownerId: u._id,
        name: `${name} ${testSuffix}`,
        type: 'ngo',
        registrationNumber: `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        contactPerson: `${name} Director`,
        address: `${name} Street, Mumbai`,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        phone,
        email: u.email,
        location: {
          type: 'Point',
          coordinates: coords,
        },
        verificationStatus,
      });
      createdOrgIds.push(org._id);

      u.organizationId = org._id;
      await u.save();
      return { user: u, org };
    }

    const ngoA = await createNgoHelper('Hope Relief NGO A', ngoACoords, ORG_STATUS.VERIFIED, '9888800001');
    const ngoB = await createNgoHelper('Seva Foundation NGO B', ngoBCoords, ORG_STATUS.VERIFIED, '9888800002');
    const ngoC = await createNgoHelper('Aarogya Trust NGO C', ngoCCoords, ORG_STATUS.VERIFIED, '9888800003');
    const ngoPending = await createNgoHelper('Unverified Clinic', ngoPendingCoords, ORG_STATUS.PENDING, '9888800004');

    console.log('   ✅ 4 Organizations seeded successfully.');

    // -------------------------------------------------------------------------
    // STEP 2: Test Geospatial Radius Expansion (5 km -> 10 km -> 20 km)
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 2: Verifying Geospatial Radius Expansion...');

    const res5km = await findNearbyOrganizations({ lat: donorCoords[1], lng: donorCoords[0], radiusKm: 5 });
    const res10km = await findNearbyOrganizations({ lat: donorCoords[1], lng: donorCoords[0], radiusKm: 10 });
    const res20km = await findNearbyOrganizations({ lat: donorCoords[1], lng: donorCoords[0], radiusKm: 20 });

    const ids5km = res5km.map((o) => o._id.toString());
    const ids10km = res10km.map((o) => o._id.toString());
    const ids20km = res20km.map((o) => o._id.toString());

    // 5km should include NGO A only (dist ~1.5km)
    if (!ids5km.includes(ngoA.org._id.toString())) throw new Error('5km radius missing NGO A!');
    if (ids5km.includes(ngoB.org._id.toString())) throw new Error('5km radius should not include NGO B!');
    if (ids5km.includes(ngoPending.org._id.toString())) throw new Error('Unverified NGO must NOT be returned in 5km!');
    console.log(`   ✅ 5 km radius returned NGO A (found ${ids5km.length} orgs total).`);

    // 10km should include NGO A and NGO B
    if (!ids10km.includes(ngoA.org._id.toString()) || !ids10km.includes(ngoB.org._id.toString())) {
      throw new Error('10km radius missing NGO A or NGO B!');
    }
    if (ids10km.includes(ngoC.org._id.toString())) throw new Error('10km radius should not include NGO C!');
    if (ids10km.includes(ngoPending.org._id.toString())) throw new Error('Unverified NGO must NOT be returned in 10km!');
    console.log(`   ✅ 10 km radius returned NGO A and NGO B (found ${ids10km.length} orgs total).`);

    // 20km should include NGO A, NGO B, NGO C
    if (!ids20km.includes(ngoA.org._id.toString()) || !ids20km.includes(ngoB.org._id.toString()) || !ids20km.includes(ngoC.org._id.toString())) {
      throw new Error('20km radius missing NGO A, B, or C!');
    }
    if (ids20km.includes(ngoPending.org._id.toString())) throw new Error('Unverified NGO must NOT be returned in 20km!');
    console.log(`   ✅ 20 km radius returned all 3 verified NGOs; unverified NGO strictly excluded.`);

    // -------------------------------------------------------------------------
    // STEP 3: Compliance Screening for NGO Requirements
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 3: Compliance Screening on Requirements...');

    const tramadolCheck = checkNonCompliantKeywords('Tramadol 50mg Tablets');
    if (!tramadolCheck || tramadolCheck.type !== 'controlled') {
      throw new Error('Tramadol failed compliance screening rejection!');
    }
    console.log('   ✅ Controlled substance (Tramadol) correctly blocked by screening.');

    const insulinCheck = checkNonCompliantKeywords('Human Insulin 100IU/ml');
    if (!insulinCheck || insulinCheck.type !== 'cold_chain') {
      throw new Error('Insulin failed compliance screening rejection!');
    }
    console.log('   ✅ Cold-chain substance (Insulin) correctly blocked by screening.');

    const paraCheck = checkNonCompliantKeywords('Paracetamol 500mg');
    if (paraCheck !== null) {
      throw new Error('Paracetamol was incorrectly flagged by screening!');
    }

    // Validate Zod schema enforcement
    const invalidZod = createRequirementSchema.safeParse({
      medicineName: 'Tramadol 50mg Tablets',
      quantityNeeded: 10,
      unit: 'strip',
    });
    if (invalidZod.success) {
      throw new Error('createRequirementSchema allowed non-compliant Tramadol!');
    }

    const validZod = createRequirementSchema.safeParse({
      medicineName: 'Paracetamol 500 mg',
      quantityNeeded: 50,
      unit: 'strip',
    });
    if (!validZod.success) {
      throw new Error(`createRequirementSchema rejected compliant Paracetamol: ${JSON.stringify(validZod.error)}`);
    }
    console.log('   ✅ Standard medicine (Paracetamol 500mg) allowed by Zod schema.');

    // Create an open requirement for NGO A
    const reqA = await Request.create({
      organizationId: ngoA.org._id,
      requestedBy: ngoA.user._id,
      medicineName: 'Paracetamol 500 mg',
      medicineNameLower: normalizeMedicineName('Paracetamol 500 mg'),
      quantityNeeded: 50,
      unit: 'strip',
      urgency: REQUIREMENT_URGENCY.URGENT,
      status: REQUEST_STATUS.OPEN,
      description: 'Urgent need for flood relief camp',
      neededBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    createdReqIds.push(reqA._id);
    console.log('   ✅ NGO A posted an open requirement for Paracetamol 500 mg.');

    // -------------------------------------------------------------------------
    // STEP 4: Seed Approved Donation & Medicines
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 4: Seeding Approved Donation with Real Coordinates...');

    const donation = await Donation.create({
      donorId: donor._id,
      donationCode: `DON-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      status: DONATION_STATUS.APPROVED,
      location: {
        type: 'Point',
        coordinates: donorCoords,
      },
      pickupAddress: {
        line1: '101 Bandra Kurla Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400051',
      },
      items: [],
      matchedOrganizationIds: [],
    });
    createdDonationIds.push(donation._id);

    const med1 = await Medicine.create({
      donationId: donation._id,
      donorId: donor._id,
      name: 'Paracetamol 500mg',
      genericName: 'Paracetamol',
      quantity: 30,
      unit: 'strip',
      batchNumber: 'BATCH-PCM-01',
      expiryDate: new Date('2027-06-30'),
      status: MEDICINE_STATUS.APPROVED,
      verificationState: {
        currentRound: 1,
        totalRounds: 1,
      },
    });
    createdMedIds.push(med1._id);

    const med2 = await Medicine.create({
      donationId: donation._id,
      donorId: donor._id,
      name: 'Amoxicillin 250mg',
      genericName: 'Amoxicillin',
      quantity: 20,
      unit: 'box',
      batchNumber: 'BATCH-AMX-02',
      expiryDate: new Date('2027-08-31'),
      status: MEDICINE_STATUS.APPROVED,
      verificationState: {
        currentRound: 1,
        totalRounds: 1,
      },
    });
    createdMedIds.push(med2._id);

    donation.items = [med1._id, med2._id];
    await donation.save();
    console.log('   ✅ Donation created with 2 approved medicines at donor coordinates.');

    // -------------------------------------------------------------------------
    // STEP 5: NGO A Searches Nearby Inventory (Privacy & Match Score Check)
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 5: NGO A Searches Available Medicines Nearby (Privacy Verification)...');

    const nearbyMedsForNgoA = await findAvailableMedicinesNear(ngoA.org, {
      radiusKm: 10,
    });

    const foundDonation = nearbyMedsForNgoA.donations.find((d) => d.donationId.toString() === donation._id.toString());
    if (!foundDonation) throw new Error('NGO A could not find nearby approved donation!');

    // Check Privacy: donor name, phone, email, street MUST NOT be exposed
    if (foundDonation.donor) throw new Error('PRIVACY VIOLATION: Donor object exposed in nearby search!');
    if (foundDonation.pickupAddress?.line1) throw new Error('PRIVACY VIOLATION: Full street address exposed in nearby search!');
    if (foundDonation.city !== 'Mumbai') throw new Error('Approximate city missing in nearby search!');

    // Check Match score & badge
    console.log(`   Found donation ${foundDonation.donationCode}:`);
    console.log(`   - Distance: ${foundDonation.distanceKm} km`);
    console.log(`   - Best Match Score: ${foundDonation.bestMatchScore}`);
    console.log(`   - Approximate Location: [${foundDonation.approximateLocation?.lat}, ${foundDonation.approximateLocation?.lng}]`);
    if (foundDonation.bestMatchScore < 50) throw new Error('Expected high match score due to matching Paracetamol requirement!');
    console.log('   ✅ Privacy verified: Real address and identity concealed. High match score calculated.');

    // -------------------------------------------------------------------------
    // STEP 6: Claims Creation, Mutual Exclusivity, and Superseding
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 6: Testing Claims Flow & Automatic Superseding...');

    // NGO A creates Claim A for both medicines
    const claimA = await createClaim({
      user: ngoA.user,
      donationId: donation._id,
      medicineIds: [med1._id, med2._id],
      message: 'Claiming both Paracetamol and Amoxicillin for our health camp.',
    });
    createdClaimIds.push(claimA._id);
    console.log(`   ✅ Claim A created: ${claimA.claimCode} by NGO A for 2 items (status: ${claimA.status}).`);

    // NGO B also creates Claim B for Paracetamol
    const claimB = await createClaim({
      user: ngoB.user,
      donationId: donation._id,
      medicineIds: [med1._id],
      message: 'Competing claim from NGO B for Paracetamol.',
    });
    createdClaimIds.push(claimB._id);
    console.log(`   ✅ Claim B created: ${claimB.claimCode} by NGO B (status: ${claimB.status}).`);

    // Donor Accepts Claim A
    console.log('   Donor accepts Claim A...');
    const acceptResult = await acceptClaim({
      claimId: claimA._id,
      user: donor,
      note: 'Accepted Claim A for Hope Relief NGO A',
    });

    if (acceptResult.status !== CLAIM_STATUS.ACCEPTED) {
      throw new Error(`Expected Claim A to be accepted, got ${acceptResult.status}`);
    }

    // Check med1 and med2 reservations
    const reloadedMed1 = await Medicine.findById(med1._id);
    const reloadedMed2 = await Medicine.findById(med2._id);
    if (reloadedMed1.status !== MEDICINE_STATUS.RESERVED || reloadedMed2.status !== MEDICINE_STATUS.RESERVED) {
      throw new Error(`Expected both items to be reserved, got ${reloadedMed1.status} and ${reloadedMed2.status}`);
    }
    if (
      reloadedMed1.reservation?.claimId?.toString() !== claimA._id.toString() ||
      reloadedMed2.reservation?.claimId?.toString() !== claimA._id.toString()
    ) {
      throw new Error('Reservation claimId mismatch on reserved items!');
    }
    console.log(`   ✅ Both medicines transitioned to 'reserved' under Claim A.`);

    // Check donation status
    const reloadedDonation = await Donation.findById(donation._id).populate('items');
    const derivedStatus = deriveDonationStatus(reloadedDonation.items);
    if (derivedStatus !== DONATION_STATUS.MATCHED) {
      throw new Error(`Expected donation derived status to be 'matched', got ${derivedStatus}`);
    }
    console.log(`   ✅ Donation derived status transitioned to 'matched'.`);

    // Check Claim B was automatically SUPERSEDED
    const reloadedClaimB = await Claim.findById(claimB._id);
    if (reloadedClaimB.status !== CLAIM_STATUS.SUPERSEDED) {
      throw new Error(`Expected Claim B to be 'superseded', got ${reloadedClaimB.status}`);
    }
    console.log(`   ✅ Claim B from NGO B was automatically marked 'superseded' with mutual exclusivity.`);

    // -------------------------------------------------------------------------
    // STEP 7: Handover Details Access & Audit Log Verification
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 7: Handover Details Access Control & Audit Logging...');

    // NGO A views handover details -> ALLOWED
    const ngoAHandover = await getHandoverDetails({
      claimId: claimA._id,
      user: ngoA.user,
      req: { ip: '127.0.0.1', headers: { 'user-agent': 'WalkthroughAgent/1.0' } },
    });
    if (!ngoAHandover.donor?.phone || !ngoAHandover.donor?.pickupAddress?.line1) {
      throw new Error('NGO A was not granted donor contact details on accepted claim!');
    }
    console.log(`   ✅ NGO A retrieved donor contact: ${ngoAHandover.donor.phone}, ${ngoAHandover.donor.pickupAddress.line1}`);

    // Verify AuditLog record
    const auditRecord = await AuditLog.findOne({
      action: AUDIT_ACTIONS.CLAIM_CONTACT_REVEALED,
      'meta.claimId': claimA._id,
    });
    if (!auditRecord) throw new Error('Missing CLAIM_CONTACT_REVEALED audit log record!');
    console.log(`   ✅ Audit log recorded for contact reveal (userId: ${auditRecord.userId}).`);

    // NGO B views handover details -> FORBIDDEN (403)
    let ngoBBlocked = false;
    try {
      await getHandoverDetails({
        claimId: claimA._id,
        user: ngoB.user,
      });
    } catch (err) {
      if (err.statusCode === 403) ngoBBlocked = true;
    }
    if (!ngoBBlocked) throw new Error('NGO B was able to access Claim A handover details!');
    console.log('   ✅ NGO B strictly forbidden (403) from accessing Claim A handover details.');

    // -------------------------------------------------------------------------
    // STEP 8: Match Cancellation
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 8: Cancelling Match & Reverting Medicine Status...');

    await cancelClaim({
      claimId: claimA._id,
      user: donor,
      reason: 'Donor emergency travel; cancelling match.',
    });

    const cancelledClaimA = await Claim.findById(claimA._id);
    if (cancelledClaimA.status !== CLAIM_STATUS.CANCELLED) {
      throw new Error(`Expected Claim A to be cancelled, got ${cancelledClaimA.status}`);
    }

    const unreservedMed1 = await Medicine.findById(med1._id);
    const unreservedMed2 = await Medicine.findById(med2._id);
    if (unreservedMed1.status !== MEDICINE_STATUS.APPROVED || unreservedMed2.status !== MEDICINE_STATUS.APPROVED) {
      throw new Error(`Expected medicines to revert to 'approved', got ${unreservedMed1.status} and ${unreservedMed2.status}`);
    }
    if (unreservedMed1.reservation?.claimId || unreservedMed2.reservation?.claimId) {
      throw new Error('Medicine reservation was not cleared after match cancellation!');
    }

    const cancelledDonation = await Donation.findById(donation._id).populate('items');
    if (cancelledDonation.status !== DONATION_STATUS.APPROVED) {
      throw new Error(`Expected donation to revert to 'approved', got ${cancelledDonation.status}`);
    }
    console.log(`   ✅ Match cancelled: Claim A is 'cancelled', medicines reverted to 'approved', and donation returned to 'approved'.`);

    // -------------------------------------------------------------------------
    // STEP 9: Donor Offer to NGO C & Decline Cooldown
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 9: Donor Offer to NGO C, Decline & Cooldown Protection...');

    const claimC = await createClaim({
      user: donor,
      donationId: donation._id,
      medicineIds: [med1._id],
      organizationId: ngoC.org._id,
      message: 'Offering to Aarogya Trust NGO C.',
    });
    createdClaimIds.push(claimC._id);
    console.log(`   ✅ Donor offered Claim C to NGO C (${claimC.claimCode}).`);

    // NGO C Declines
    await declineClaim({
      claimId: claimC._id,
      user: ngoC.user,
      reason: 'Our capacity for this medicine is currently full.',
    });

    const declinedClaimC = await Claim.findById(claimC._id);
    if (declinedClaimC.status !== CLAIM_STATUS.DECLINED) {
      throw new Error(`Expected Claim C to be declined, got ${declinedClaimC.status}`);
    }
    console.log(`   ✅ NGO C successfully declined Claim C.`);

    // Immediate re-offer should be blocked by cooldown
    let cooldownBlocked = false;
    try {
      await createClaim({
        user: donor,
        donationId: donation._id,
        medicineIds: [med1._id],
        organizationId: ngoC.org._id,
      });
    } catch (err) {
      if (err.message.includes('declined') || err.message.includes('wait') || err.message.includes('cooldown') || err.statusCode === 400) {
        cooldownBlocked = true;
      }
    }
    if (!cooldownBlocked) throw new Error('Donor was able to re-offer to NGO C immediately without cooldown!');
    console.log('   ✅ Cooldown enforced: Donor prevented from immediately spamming declined NGO.');

    // -------------------------------------------------------------------------
    // STEP 10: Expiry Job Interplay (Stale Claims & Auto-cancelling Expired Meds)
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 10: Scheduled Expiry Job Interplay with Claims...');

    // Create a pending claim with past expiresAt
    const staleClaim = await Claim.create({
      claimCode: `CLM-2026-STALE-${Math.floor(1000 + Math.random() * 9000)}`,
      donationId: donation._id,
      organizationId: ngoA.org._id,
      donorId: donor._id,
      medicineIds: [med2._id],
      distanceKm: 1.4,
      initiatedBy: CLAIM_INITIATOR.NGO,
      initiatedByUserId: ngoA.user._id,
      status: CLAIM_STATUS.PENDING,
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    });
    createdClaimIds.push(staleClaim._id);

    // Run expiry check
    const jobResult = await runExpiryCheck({ dryRun: false });
    const reloadedStaleClaim = await Claim.findById(staleClaim._id);
    if (reloadedStaleClaim.status !== CLAIM_STATUS.EXPIRED) {
      throw new Error(`Expected stale claim to be 'expired', got ${reloadedStaleClaim.status}`);
    }
    console.log(`   ✅ Stale claim auto-expired by scheduled expiry job.`);

    // -------------------------------------------------------------------------
    // STEP 11: Role Gating & Security Checks
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 11: Role Gating & Security Checks...');

    // 1. Unverified NGO cannot create claims
    let unverifiedNgoBlocked = false;
    try {
      await createClaim({
        user: ngoPending.user,
        donationId: donation._id,
        medicineIds: [med2._id],
      });
    } catch (err) {
      if (err.statusCode === 400 || err.message.includes('verified')) {
        unverifiedNgoBlocked = true;
      }
    }
    if (!unverifiedNgoBlocked) throw new Error('Unverified NGO was permitted to create a claim!');
    console.log('   ✅ Unverified NGO strictly blocked from creating claims.');

    // 2. Donor offering donation requires organizationId
    let donorMissingOrgBlocked = false;
    try {
      await createClaim({
        user: donor,
        donationId: donation._id,
        medicineIds: [med2._id],
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('organizationId')) {
        donorMissingOrgBlocked = true;
      }
    }
    if (!donorMissingOrgBlocked) throw new Error('Donor created claim without specifying target organizationId!');
    console.log('   ✅ Donor offer without target organizationId rejected.');

    // -------------------------------------------------------------------------
    // STEP 12: Cleanup Test Data
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 12: Cleaning Up Test Data...');
    await Claim.deleteMany({ _id: { $in: createdClaimIds } });
    await Request.deleteMany({ _id: { $in: createdReqIds } });
    await Medicine.deleteMany({ _id: { $in: createdMedIds } });
    await Donation.deleteMany({ _id: { $in: createdDonationIds } });
    await Organization.deleteMany({ _id: { $in: createdOrgIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await AuditLog.deleteMany({ 'meta.claimId': { $in: createdClaimIds } });
    await Notification.deleteMany({ userId: { $in: createdUserIds } });
    console.log('   ✅ All test artifacts cleaned up cleanly from database.');

    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log('🎉 PHASE 6 COMPLETE WALKTHROUGH PASSED ALL 12 VERIFICATION CHECKS!');
    console.log('══════════════════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ WALKTHROUGH FAILED WITH ERROR:', error);
    // Attempt cleanup
    try {
      await Claim.deleteMany({ _id: { $in: createdClaimIds } });
      await Request.deleteMany({ _id: { $in: createdReqIds } });
      await Medicine.deleteMany({ _id: { $in: createdMedIds } });
      await Donation.deleteMany({ _id: { $in: createdDonationIds } });
      await Organization.deleteMany({ _id: { $in: createdOrgIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    } catch (_) {}
    await mongoose.connection.close();
    process.exit(1);
  }
}

runPhase6Walkthrough();
