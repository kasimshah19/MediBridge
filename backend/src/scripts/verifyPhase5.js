import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import app from '../app.js';
import User from '../models/User.js';
import Donation from '../models/Donation.js';
import Medicine from '../models/Medicine.js';
import Verification from '../models/Verification.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { ROLES, APPROVAL_STATUS, MEDICINE_STATUS, DONATION_STATUS, REJECTION_REASON_CODES } from '../config/constants.js';

// 1x1 Transparent JPEG image buffer for photo upload test
const VALID_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x00, 0xff, 0xd9,
]);

async function runPhase5Walkthrough() {
  console.log('================================================================');
  console.log('🔬 MEDIBRIDGE PHASE 5 - PHARMACIST VERIFICATION WALKTHROUGH TEST');
  console.log('================================================================\n');

  let passed = 0;
  let total = 14;

  await connectDB();
  const ts = Date.now();

  // Helper to register & login or create a user and get cookie
  async function setupUser(role, approvalStatus, name, email) {
    const passwordHash = await bcrypt.hash('Password@123', 10);
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        passwordHash,
        role,
        approvalStatus: approvalStatus || APPROVAL_STATUS.APPROVED,
        accountStatus: 'active',
        phone: '9876543210',
        city: 'Mumbai',
        pharmacyName: role === ROLES.PHARMACIST ? 'Apex Care Pharmacy' : undefined,
        licenseNumber: role === ROLES.PHARMACIST ? `PHARM-LIC-${Date.now()}` : undefined,
      });
    } else {
      user.role = role;
      user.approvalStatus = approvalStatus || APPROVAL_STATUS.APPROVED;
      user.accountStatus = 'active';
      user.passwordHash = passwordHash;
      if (role === ROLES.PHARMACIST) {
        user.pharmacyName = 'Apex Care Pharmacy';
      }
      await user.save();
    }

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Password@123' });

    const cookie = loginRes.headers['set-cookie']
      ? loginRes.headers['set-cookie'][0].split(';')[0]
      : '';

    return { user, cookie };
  }

  try {
    // 1. SETUP ACTORS
    console.log('1. Setting up actors (Donor, 2 Approved Pharmacists, Pending Pharmacist, Admin, NGO)...');
    const donor = await setupUser(ROLES.DONOR, APPROVAL_STATUS.NOT_APPLICABLE, 'Arjun Donor', `donor_${ts}@medibridge.local`);
    const pharm1 = await setupUser(ROLES.PHARMACIST, APPROVAL_STATUS.APPROVED, 'Dr. Sunita Sharma', `pharm1_${ts}@medibridge.local`);
    const pharm2 = await setupUser(ROLES.PHARMACIST, APPROVAL_STATUS.APPROVED, 'Dr. Rajiv Mehta', `pharm2_${ts}@medibridge.local`);
    const pendingPharm = await setupUser(ROLES.PHARMACIST, APPROVAL_STATUS.PENDING, 'Pooja Pending', `pharm_pend_${ts}@medibridge.local`);
    const ngo = await setupUser(ROLES.NGO, APPROVAL_STATUS.APPROVED, 'Care NGO', `ngo_${ts}@medibridge.local`);
    const admin = await setupUser(ROLES.ADMIN, APPROVAL_STATUS.NOT_APPLICABLE, 'Admin Kasim', `admin_${ts}@medibridge.local`);
    console.log('   Actors initialized successfully.\n');

    // TEST 1: RBAC & Approval Gating on Pharmacist Endpoints
    process.stdout.write('Test 1: RBAC & Approval Gating on Pharmacist Routes... ');
    const [donorRes, ngoRes, pendingRes] = await Promise.all([
      request(app).get('/api/verification/queue').set('Cookie', donor.cookie),
      request(app).get('/api/verification/queue').set('Cookie', ngo.cookie),
      request(app).get('/api/verification/queue').set('Cookie', pendingPharm.cookie),
    ]);
    if (donorRes.status === 403 && ngoRes.status === 403 && pendingRes.status === 403) {
      console.log('✅ PASS (Donor, NGO, and Pending Pharmacist all received 403 Forbidden)');
      passed++;
    } else {
      console.log(`❌ FAIL (Statuses: donor=${donorRes.status}, ngo=${ngoRes.status}, pending=${pendingRes.status})`);
    }

    // TEST 2: Donor Submits Donation with 3 Valid Medicines & Photos
    process.stdout.write('Test 2: Donor Submits Donation with 3 Valid Medicines & Photos... ');
    const futureExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const draftRes = await request(app)
      .post('/api/donations')
      .set('Cookie', donor.cookie)
      .send({
        pickupAddress: {
          line1: 'Flat 402, Sunset Heights',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        location: { lat: 19.076, lng: 72.8777 },
        contactPhone: '9876543210',
        items: [
          {
            name: 'Amoxicillin 500mg',
            genericName: 'Amoxicillin',
            manufacturer: 'Cipla Ltd',
            batchNumber: `AMX-${ts}`,
            expiryDate: futureExpiry,
            quantity: 20,
            unit: 'strip',
            medicineType: 'capsule',
            packagingCondition: 'sealed',
            storageCondition: 'room_temperature',
          },
          {
            name: 'Paracetamol 650mg',
            genericName: 'Paracetamol',
            manufacturer: 'Micro Labs',
            batchNumber: `PCM-${ts}`,
            expiryDate: futureExpiry,
            quantity: 30,
            unit: 'strip',
            medicineType: 'tablet',
            packagingCondition: 'sealed',
            storageCondition: 'room_temperature',
          },
          {
            name: 'Azithromycin 500mg',
            genericName: 'Azithromycin',
            manufacturer: 'Sun Pharma',
            batchNumber: `AZM-${ts}`,
            expiryDate: futureExpiry,
            quantity: 15,
            unit: 'strip',
            medicineType: 'tablet',
            packagingCondition: 'sealed',
            storageCondition: 'room_temperature',
          },
        ],
      });

    if (draftRes.status !== 201) {
      console.log(`❌ FAIL create draft (${draftRes.status}: ${JSON.stringify(draftRes.body)})`);
      throw new Error(`Failed to create draft donation: ${JSON.stringify(draftRes.body)}`);
    }

    const donationId = draftRes.body.data._id;
    const items = draftRes.body.data.items;

    // Attach valid JPEG photo to all 3 items
    for (const item of items) {
      await request(app)
        .post(`/api/donations/${donationId}/items/${item._id}/photos`)
        .set('Cookie', donor.cookie)
        .attach('photo', VALID_JPEG, 'medicine.jpg');
    }

    // Submit donation
    const submitRes = await request(app)
      .post(`/api/donations/${donationId}/submit`)
      .set('Cookie', donor.cookie)
      .send({
        declarations: {
          sealedAndUnused: true,
          storedProperly: true,
          notControlled: true,
          genuineInfo: true,
        },
      });

    if (submitRes.status === 200 && submitRes.body.data.status === 'under_verification') {
      console.log(`✅ PASS (Donation ${submitRes.body.data.donationCode} submitted, status: under_verification)`);
      passed++;
    } else {
      console.log(`❌ FAIL (${submitRes.status}: ${JSON.stringify(submitRes.body)})`);
    }

    // TEST 3: Pharmacist Queue Visibility & Privacy Enforcement
    process.stdout.write('Test 3: Pharmacist Queue Visibility & Strict Privacy Stripping... ');
    const queueRes = await request(app)
      .get('/api/verification/queue')
      .set('Cookie', pharm1.cookie);

    const detailRes = await request(app)
      .get(`/api/verification/donations/${donationId}`)
      .set('Cookie', pharm1.cookie);

    const detailData = detailRes.body.data;
    const privacyPreserved =
      !detailData.donor.phone &&
      !detailData.donor.email &&
      !detailData.pickupAddress &&
      !detailData.location;

    if (queueRes.status === 200 && detailRes.status === 200 && privacyPreserved) {
      console.log('✅ PASS (Queue returned list; Review detail strictly stripped donor phone, email, address line 1, and coordinates)');
      passed++;
    } else {
      console.log('❌ FAIL (Privacy violation or non-200 response)');
    }

    // TEST 4: Verification Claim System & Concurrency Protection
    process.stdout.write('Test 4: Verification Claim Locking & Concurrency Conflict... ');
    const claim1Res = await request(app)
      .post(`/api/verification/donations/${donationId}/claim`)
      .set('Cookie', pharm1.cookie);

    const claim2Res = await request(app)
      .post(`/api/verification/donations/${donationId}/claim`)
      .set('Cookie', pharm2.cookie);

    const unheldDecisionRes = await request(app)
      .post(`/api/verification/items/${items[0]._id}/decision`)
      .set('Cookie', pharm2.cookie)
      .send({
        decision: 'approved',
        checklist: {
          packagingIntact: true,
          batchReadable: true,
          expiryValid: true,
          storageReliable: true,
          authenticityEstablished: true,
          policyEligible: true,
        },
      });

    if (claim1Res.status === 200 && claim2Res.status === 409 && unheldDecisionRes.status === 409) {
      console.log('✅ PASS (Pharm 1 claimed, Pharm 2 rejected with 409, decision without active claim rejected with 409)');
      passed++;
    } else {
      console.log(`❌ FAIL (claim1=${claim1Res.status}, claim2=${claim2Res.status}, unheldDecision=${unheldDecisionRes.status})`);
    }

    // TEST 5: Checklist Incomplete Guard (Must fail 422 if any check false)
    process.stdout.write('Test 5: Checklist Integrity Guard (Approve blocked if check false)... ');
    const incompleteChecklistRes = await request(app)
      .post(`/api/verification/items/${items[0]._id}/decision`)
      .set('Cookie', pharm1.cookie)
      .send({
        decision: 'approved',
        checklist: {
          packagingIntact: true,
          batchReadable: true,
          expiryValid: true,
          storageReliable: true,
          authenticityEstablished: false, // Incomplete!
          policyEligible: true,
        },
      });

    if (incompleteChecklistRes.status === 422) {
      console.log('✅ PASS (Approval blocked with 422 when checklist has false items)');
      passed++;
    } else {
      console.log(`❌ FAIL (${incompleteChecklistRes.status}: ${JSON.stringify(incompleteChecklistRes.body)})`);
    }

    // TEST 6: Medicine 1 Decision -> Approve
    process.stdout.write('Test 6: Medicine 1 Approved with Full 6-Point Checklist... ');
    const med1ApproveRes = await request(app)
      .post(`/api/verification/items/${items[0]._id}/decision`)
      .set('Cookie', pharm1.cookie)
      .send({
        decision: 'approved',
        checklist: {
          packagingIntact: true,
          batchReadable: true,
          expiryValid: true,
          storageReliable: true,
          authenticityEstablished: true,
          policyEligible: true,
        },
      });

    const med1Doc = await Medicine.findById(items[0]._id);
    if (med1ApproveRes.status === 200 && med1Doc.status === MEDICINE_STATUS.APPROVED) {
      console.log(`✅ PASS (Medicine 1 approved, verification round 1, status: approved)`);
      passed++;
    } else {
      console.log(`❌ FAIL (${med1ApproveRes.status})`);
    }

    // TEST 7: Medicine 2 Decision -> Reject (with code & reason)
    process.stdout.write('Test 7: Medicine 2 Rejected with Structured Reason Code... ');
    const med2RejectRes = await request(app)
      .post(`/api/verification/items/${items[1]._id}/decision`)
      .set('Cookie', pharm1.cookie)
      .send({
        decision: 'rejected',
        reasonCode: REJECTION_REASON_CODES.PACKAGING_COMPROMISED,
        reason: 'Packaging blister has visible tear along edge; cannot verify sterility.',
        checklist: {
          packagingIntact: false,
          batchReadable: true,
          expiryValid: true,
          storageReliable: true,
          authenticityEstablished: true,
          policyEligible: true,
        },
      });

    const med2Doc = await Medicine.findById(items[1]._id);
    if (med2RejectRes.status === 200 && med2Doc.status === MEDICINE_STATUS.REJECTED && med2Doc.rejectionSource === 'pharmacist') {
      console.log(`✅ PASS (Medicine 2 rejected, reasonCode recorded, rejectionSource: pharmacist)`);
      passed++;
    } else {
      console.log(`❌ FAIL (${med2RejectRes.status})`);
    }

    // TEST 8: Medicine 3 Decision -> Request More Information
    process.stdout.write('Test 8: Medicine 3 Clarification Requested (More Info)... ');
    const med3MoreInfoRes = await request(app)
      .post(`/api/verification/items/${items[2]._id}/decision`)
      .set('Cookie', pharm1.cookie)
      .send({
        decision: 'more_info_requested',
        requestedTypes: ['clearer_expiry_photo', 'storage_details'],
        question: 'The expiration date print on the box is glare-obscured. Please upload a clear flat photograph and confirm storage history.',
        checklist: {
          packagingIntact: true,
          batchReadable: true,
          expiryValid: false,
          storageReliable: true,
          authenticityEstablished: true,
          policyEligible: true,
        },
      });

    const med3Doc = await Medicine.findById(items[2]._id);
    const donAfterMoreInfo = await Donation.findById(donationId);
    if (
      med3MoreInfoRes.status === 200 &&
      med3Doc.status === MEDICINE_STATUS.MORE_INFO_REQUIRED &&
      donAfterMoreInfo.status === DONATION_STATUS.MORE_INFO_REQUIRED
    ) {
      console.log('✅ PASS (Item 3 status: more_info_required; Donation status derived to: more_info_required)');
      passed++;
    } else {
      console.log(`❌ FAIL (${med3MoreInfoRes.status}, medStatus=${med3Doc?.status}, donStatus=${donAfterMoreInfo?.status})`);
    }

    // TEST 9: Donor View & Verification Transparency (No pharmacist private info)
    process.stdout.write('Test 9: Donor Detail Transparency & Pharmacist Privacy Shield... ');
    const donorViewRes = await request(app)
      .get(`/api/donations/${donationId}`)
      .set('Cookie', donor.cookie);

    const donorViewItems = donorViewRes.body.data.items;
    const med3View = donorViewItems.find((i) => i._id === items[2]._id.toString());
    const pharmPrivacyPreserved =
      med3View.verification?.pharmacist?.firstName &&
      !med3View.verification?.pharmacist?.email &&
      !med3View.verification?.pharmacist?.phone;

    if (donorViewRes.status === 200 && med3View.verification?.question && pharmPrivacyPreserved) {
      console.log('✅ PASS (Donor sees decisions, reasons, questions, and pharmacist first name without email/phone)');
      passed++;
    } else {
      console.log('❌ FAIL (Donor view missing info or privacy leaked)');
    }

    // TEST 10: Donor Clarification Response & Photo Upload
    process.stdout.write('Test 10: Donor Uploads Additional Photo & Submits Clarification... ');
    // Upload extra photo to item in more_info_required
    const extraPhotoRes = await request(app)
      .post(`/api/donations/${donationId}/items/${items[2]._id}/photos`)
      .set('Cookie', donor.cookie)
      .attach('photo', VALID_JPEG, 'clear_expiry.jpg');

    // Submit clarification response
    const respondRes = await request(app)
      .post(`/api/donations/${donationId}/items/${items[2]._id}/respond`)
      .set('Cookie', donor.cookie)
      .send({
        message: 'Uploaded a clear photo taken under diffuse light showing EXP 12/2027 clearly. Stored in dry indoor cabinet.',
        storageHistory: 'Kept in bedroom medicine cabinet under 25C.',
      });

    const med3AfterRespond = await Medicine.findById(items[2]._id);
    const donAfterRespond = await Donation.findById(donationId);
    if (
      [200, 201].includes(extraPhotoRes.status) &&
      respondRes.status === 200 &&
      med3AfterRespond.status === MEDICINE_STATUS.PENDING &&
      donAfterRespond.status === DONATION_STATUS.UNDER_VERIFICATION
    ) {
      console.log('✅ PASS (Clarification submitted; Item returned to pending; Donation back under_verification)');
      passed++;
    } else {
      console.log(`❌ FAIL (extraPhoto=${extraPhotoRes.status}, respond=${respondRes.status}, medStatus=${med3AfterRespond?.status})`);
    }

    // TEST 11: Round 2 Pharmacist Review & Final Donation Status Derivation
    process.stdout.write('Test 11: Round 2 Review & Deterministic Status Derivation... ');
    // Pharmacist 1 claims donation for round 2
    await request(app)
      .post(`/api/verification/donations/${donationId}/claim`)
      .set('Cookie', pharm1.cookie);

    // Pharmacist 1 approves Medicine 3 in round 2
    const round2ApproveRes = await request(app)
      .post(`/api/verification/items/${items[2]._id}/decision`)
      .set('Cookie', pharm1.cookie)
      .send({
        decision: 'approved',
        checklist: {
          packagingIntact: true,
          batchReadable: true,
          expiryValid: true,
          storageReliable: true,
          authenticityEstablished: true,
          policyEligible: true,
        },
      });

    const finalDonation = await Donation.findById(donationId);
    // Since Med 1 is approved, Med 2 rejected, Med 3 approved -> derived status is partially_approved (or approved)
    const validFinalStatus = ['partially_approved', 'approved'].includes(finalDonation.status);

    if (round2ApproveRes.status === 200 && validFinalStatus) {
      console.log(`✅ PASS (Round 2 approved; Derived donation status: ${finalDonation.status})`);
      passed++;
    } else {
      console.log(`❌ FAIL (round2=${round2ApproveRes.status}, finalDonationStatus=${finalDonation?.status})`);
    }

    // TEST 12: Lazy Claim Expiry & Takeover by Pharmacist 2
    process.stdout.write('Test 12: Lazy Claim Expiry & Takeover by Pharmacist 2... ');
    // Create another donation to test claim takeover
    const don2 = await Donation.create({
      donorId: donor.user._id,
      donationCode: `DON-${ts}-2`,
      status: DONATION_STATUS.UNDER_VERIFICATION,
      items: [items[0]._id],
      review: {
        claimedBy: pharm1.user._id,
        claimedAt: new Date(Date.now() - 70 * 60 * 1000), // 70 min ago
        claimExpiresAt: new Date(Date.now() - 10 * 60 * 1000), // Expired 10 min ago!
      },
      submittedAt: new Date(),
    });

    const takeoverRes = await request(app)
      .post(`/api/verification/donations/${don2._id}/claim`)
      .set('Cookie', pharm2.cookie);

    const don2Updated = await Donation.findById(don2._id);
    if (takeoverRes.status === 200 && don2Updated.review.claimedBy.equals(pharm2.user._id)) {
      console.log('✅ PASS (Expired claim cleanly taken over by Pharmacist 2)');
      passed++;
    } else {
      console.log(`❌ FAIL (takeover=${takeoverRes.status})`);
    }

    // TEST 13: Admin Force-Release & Verification Log
    process.stdout.write('Test 13: Admin Force-Release & Platform Audit Log... ');
    const forceReleaseRes = await request(app)
      .post(`/api/admin/verification/donations/${don2._id}/force-release`)
      .set('Cookie', admin.cookie)
      .send({ reason: 'Pharmacist unreachable; releasing for peer review.' });

    const adminLogRes = await request(app)
      .get('/api/admin/verification/log')
      .set('Cookie', admin.cookie);

    const adminSummaryRes = await request(app)
      .get('/api/admin/verification/summary')
      .set('Cookie', admin.cookie);

    if (
      forceReleaseRes.status === 200 &&
      adminLogRes.status === 200 &&
      adminSummaryRes.status === 200 &&
      adminLogRes.body.data.log.length > 0
    ) {
      console.log('✅ PASS (Admin force-release executed; Verification log and summary returned metrics)');
      passed++;
    } else {
      console.log(`❌ FAIL (forceRelease=${forceReleaseRes.status}, log=${adminLogRes.status})`);
    }

    // TEST 14: Expired Item Approval Prevention (assertNotExpired)
    process.stdout.write('Test 14: Expired Item Approval Blocked (409 Conflict)... ');
    const expiredMed = await Medicine.create({
      donationId,
      donorId: donor.user._id,
      name: 'Expired Syrup',
      batchNumber: `EXP-${ts}`,
      expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      quantity: 1,
      unit: 'bottle',
      medicineType: 'syrup',
      packagingCondition: 'sealed',
      storageCondition: 'room_temperature',
      status: MEDICINE_STATUS.PENDING,
      photos: [{ originalName: 'syrup.jpg', storedName: 'dummy.jpg', mimeType: 'image/jpeg', size: 100, storagePath: 'dummy' }],
      screening: { status: 'passed' },
      version: 0,
    });

    // Claim donation for pharm1 and attach expired medicine
    await Donation.findByIdAndUpdate(donationId, {
      $push: { items: expiredMed._id },
      $set: {
        status: DONATION_STATUS.UNDER_VERIFICATION,
        'review.claimedBy': pharm1.user._id,
        'review.claimExpiresAt': new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const expiredApproveRes = await request(app)
      .post(`/api/verification/items/${expiredMed._id}/decision`)
      .set('Cookie', pharm1.cookie)
      .send({
        decision: 'approved',
        checklist: {
          packagingIntact: true,
          batchReadable: true,
          expiryValid: true,
          storageReliable: true,
          authenticityEstablished: true,
          policyEligible: true,
        },
      });

    if (expiredApproveRes.status === 409) {
      console.log('✅ PASS (Approval rejected with 409 Conflict because medicine has expired)');
      passed++;
    } else {
      console.log(`❌ FAIL (Expected 409, got ${expiredApproveRes.status})`);
    }

    console.log('\n================================================================');
    console.log(`📊 WALKTHROUGH COMPLETE: ${passed} / ${total} TESTS PASSED`);
    console.log('================================================================');

    await mongoose.connection.close();
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('\n❌ Unhandled Error in Walkthrough:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

runPhase5Walkthrough();
