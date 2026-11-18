import mongoose from 'mongoose';
import CustodyEvent, { computeCustodyEventHash } from '../models/CustodyEvent.js';
import Medicine from '../models/Medicine.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { ROLES, CUSTODY_EVENT_TYPES } from '../config/constants.js';

/**
 * Strips any sensitive PII (phone, email, street, coordinates) from custody event metadata.
 */
const sanitizeMeta = (meta = {}) => {
  if (!meta || typeof meta !== 'object') return {};
  const clean = { ...meta };
  const sensitiveKeys = [
    'phone',
    'contactPhone',
    'email',
    'address',
    'street',
    'coordinates',
    'location',
    'password',
    'token',
    'hash',
  ];

  for (const key of Object.keys(clean)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      delete clean[key];
    } else if (clean[key] && typeof clean[key] === 'object' && !Array.isArray(clean[key])) {
      clean[key] = sanitizeMeta(clean[key]);
    }
  }
  return clean;
};

/**
 * Appends a tamper-evident, cryptographically chained CustodyEvent.
 * Automatically computes sequential number and SHA-256 hash.
 * Retries up to 5 times on duplicate key sequence collision.
 *
 * @param {object} params
 * @param {object|string} params.medicine - Medicine document or ID
 * @param {string} params.type - One of CUSTODY_EVENT_TYPES
 * @param {object} [params.actor] - User document or actor descriptor
 * @param {object} [params.claim] - Associated Claim (optional)
 * @param {object} [params.transfer] - Associated Transfer (optional)
 * @param {object} [params.meta] - Metadata payload
 * @param {import('mongoose').ClientSession} [params.session]
 * @returns {Promise<CustodyEvent|object>} Created event
 */
export const isDbConnected = () => {
  return mongoose.connection?.readyState === 1 && Boolean(mongoose.connection?.client);
};

export const recordEvent = async ({
  medicine,
  medicineId,
  type,
  eventType,
  actor = null,
  actorId = null,
  actorRole = null,
  claim = null,
  transfer = null,
  meta = {},
  data = {},
  timestamp = null,
  session = null,
}) => {
  const target = medicine || medicineId;
  if (!target) return null;

  if (!isDbConnected()) {
    return {
      seq: 1,
      medicineCode: target?.medicineId || 'MED-SIMULATED',
      prevHash: 'GENESIS',
      hash: 'SIMULATED_HASH',
    };
  }

  let medDoc = target;
  if (!medDoc._id || !medDoc.medicineId) {
    if (mongoose.connection?.readyState === 1) {
      try {
        const q = Medicine.findById(target._id || target);
        if (session) q.session(session);
        medDoc = await q;
      } catch {}
    }
    if (!medDoc || !medDoc._id) {
      medDoc = {
        _id: target._id || target,
        medicineId:
          typeof target === 'string' && target.startsWith('MED-')
            ? target
            : `MED-${String(target._id || target).slice(-6)}`,
        donationId: target.donationId || null,
      };
    }
  }

  const effectiveType = type || eventType;
  const cleanMeta = sanitizeMeta({ ...meta, ...data });
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let lastEvent = null;
      if (mongoose.connection?.readyState === 1) {
        const lastEventQuery = CustodyEvent.findOne({ medicineId: medDoc._id }).sort({ seq: -1 });
        if (session) lastEventQuery.session(session);
        lastEvent = await lastEventQuery;
      }

      const seq = lastEvent ? lastEvent.seq + 1 : 1;
      const prevHash = lastEvent ? lastEvent.hash : 'GENESIS';
      const at = timestamp ? new Date(timestamp) : new Date();

      const resolvedActorUserId = actor?._id || actor?.userId || actorId || null;
      const resolvedActorRole =
        actor?.role || actorRole || (resolvedActorUserId ? 'user' : 'system');
      const resolvedActorType = resolvedActorRole === 'system' ? 'system' : 'user';
      const organizationId =
        actor?.organizationId ||
        transfer?.organizationId ||
        claim?.organizationId ||
        null;

      const medCode =
        medDoc.medicineId ||
        (medDoc._id ? `MED-${String(medDoc._id).slice(-6).toUpperCase()}` : 'MED-UNKNOWN');

      const payload = {
        seq,
        medicineCode: medCode,
        type: effectiveType,
        at,
        actorType: resolvedActorType,
        actorUserId: resolvedActorUserId,
        actorRole: resolvedActorRole,
        organizationId,
        meta: cleanMeta,
      };

      const hash = computeCustodyEventHash(prevHash, payload);

      const eventData = {
        medicineId: medDoc._id,
        medicineCode: medCode,
        donationId: medDoc.donationId,
        transferId: transfer?._id || null,
        claimId: claim?._id || null,
        seq,
        type: effectiveType,
        actorType: resolvedActorType,
        actorUserId: resolvedActorUserId,
        actorRole: resolvedActorRole,
        organizationId,
        at,
        meta: cleanMeta,
        prevHash,
        hash,
      };

      if (mongoose.connection?.readyState === 1) {
        const options = session ? { session } : {};
        const [created] = await CustodyEvent.create([eventData], options);
        return created;
      }
      return eventData;
    } catch (err) {
      // Retry on duplicate key sequence collision
      if (err.code === 11000 && attempt < maxRetries) {
        continue;
      }
      throw err;
    }
  }
};

/**
 * Verifies the integrity of a medicine's custody event hash chain.
 * Re-computes each link and validates chronological sequence.
 *
 * @param {string|mongoose.Types.ObjectId} medicineId
 * @returns {Promise<{ intact: boolean, eventsChecked: number, brokenAtSeq: number|null, reason: string|null }>}
 */
export const verifyChain = async (medicineId) => {
  const events = await CustodyEvent.find({ medicineId }).sort({ seq: 1 }).lean();

  if (events.length === 0) {
    return {
      valid: true,
      intact: true,
      chainValid: true,
      eventsChecked: 0,
      totalEvents: 0,
      brokenAtSeq: null,
      eventSeq: null,
      reason: null,
      latestHash: null,
    };
  }

  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const expectedSeq = i + 1;

    // 1. Verify continuous 1-based sequence
    if (current.seq !== expectedSeq) {
      return {
        valid: false,
        intact: false,
        chainValid: false,
        eventsChecked: i,
        totalEvents: events.length,
        brokenAtSeq: current.seq,
        eventSeq: current.seq,
        reason: `Broken sequence: expected seq ${expectedSeq}, found ${current.seq}`,
        latestHash: null,
      };
    }

    // 2. Verify prevHash link
    if (i === 0) {
      if (current.prevHash !== 'GENESIS') {
        return {
          valid: false,
          intact: false,
          chainValid: false,
          eventsChecked: 0,
          totalEvents: events.length,
          brokenAtSeq: 1,
          eventSeq: 1,
          reason: `Genesis mismatch: first event prevHash is '${current.prevHash}' instead of 'GENESIS'`,
          latestHash: null,
        };
      }
    } else {
      const prev = events[i - 1];
      if (current.prevHash !== prev.hash) {
        return {
          valid: false,
          intact: false,
          chainValid: false,
          eventsChecked: i,
          totalEvents: events.length,
          brokenAtSeq: current.seq,
          eventSeq: current.seq,
          reason: `Hash link broken at event #${current.seq}: prevHash does not match previous event hash`,
          latestHash: null,
        };
      }
    }

    // 3. Recompute SHA-256 hash from canonical payload
    const recomputedHash = computeCustodyEventHash(current.prevHash, {
      seq: current.seq,
      medicineCode: current.medicineCode,
      type: current.type,
      at: current.at,
      actorType: current.actorType,
      actorUserId: current.actorUserId,
      actorRole: current.actorRole,
      organizationId: current.organizationId,
      meta: current.meta,
    });

    if (recomputedHash !== current.hash) {
      return {
        valid: false,
        intact: false,
        chainValid: false,
        eventsChecked: i,
        totalEvents: events.length,
        brokenAtSeq: current.seq,
        eventSeq: current.seq,
        reason: `Cryptographic payload tampering detected at event #${current.seq}: hash mismatch`,
        latestHash: null,
      };
    }
  }

  const latestHash = events.length > 0 ? events[events.length - 1].hash : null;

  return {
    valid: true,
    intact: true,
    chainValid: true,
    eventsChecked: events.length,
    totalEvents: events.length,
    brokenAtSeq: null,
    eventSeq: null,
    reason: null,
    latestHash,
  };
};

/**
 * Builds a role-tailored, privacy-safe custody journey timeline.
 * Strips all contact information and calibrates actor names by role.
 *
 * @param {string|mongoose.Types.ObjectId} medicineId
 * @param {object} viewer - { role: string, userId: string|ObjectId, organizationId: string|ObjectId }
 * @returns {Promise<object>} Trace object
 */
export const buildTrace = async (medicineId, viewer = {}) => {
  const medicine = await Medicine.findById(medicineId)
    .populate('donationId', 'donationCode donorId')
    .lean();

  if (!medicine) {
    throw new Error('Medicine record not found');
  }

  const [events, integrity] = await Promise.all([
    CustodyEvent.find({ medicineId: medicine._id })
      .sort({ seq: 1 })
      .populate('actorUserId', 'name role pharmacistProfile')
      .populate('organizationId', 'name type')
      .lean(),
    verifyChain(medicine._id),
  ]);

  const isAdmin = viewer.role === ROLES.ADMIN;
  const isDonor = viewer.role === ROLES.DONOR;
  const isNgo = viewer.role === ROLES.NGO;
  const isPharmacist = viewer.role === ROLES.PHARMACIST;

  const timeline = events.map((evt) => {
    let actorLabel = 'System';
    let institutionName = evt.organizationId?.name || null;

    if (isAdmin) {
      actorLabel = evt.actorUserId ? `${evt.actorUserId.name} (${evt.actorRole})` : 'System';
    } else if (isDonor) {
      if (evt.actorRole === ROLES.PHARMACIST) {
        const phName = evt.actorUserId?.name?.split(' ')?.[0] || 'Pharmacist';
        const pharmacy = evt.actorUserId?.pharmacistProfile?.pharmacyName;
        actorLabel = pharmacy ? `${phName} (${pharmacy})` : `${phName} (Pharmacist)`;
      } else if (evt.actorRole === ROLES.NGO) {
        actorLabel = institutionName || 'Receiving Organization';
      } else if (evt.actorRole === ROLES.DONOR) {
        actorLabel = 'You (Donor)';
      }
    } else if (isNgo) {
      if (evt.actorRole === ROLES.DONOR) {
        actorLabel = 'Donor';
      } else if (evt.actorRole === ROLES.PHARMACIST) {
        actorLabel = 'Licensed Pharmacist';
      } else if (evt.actorRole === ROLES.NGO) {
        actorLabel = institutionName || 'Verified NGO';
      }
    } else if (isPharmacist) {
      if (evt.actorRole === ROLES.DONOR) {
        actorLabel = 'Donor';
      } else if (evt.actorRole === ROLES.PHARMACIST) {
        actorLabel = evt.actorUserId ? `${evt.actorUserId.name} (Pharmacist)` : 'Pharmacist';
      } else if (evt.actorRole === ROLES.NGO) {
        actorLabel = institutionName || 'Receiving Organization';
      }
    } else {
      // Public view
      if (evt.type === CUSTODY_EVENT_TYPES.SUBMITTED) actorLabel = 'Donor';
      else if (evt.type === CUSTODY_EVENT_TYPES.PHARMACIST_APPROVED) actorLabel = 'Pharmacist';
      else if (evt.type === CUSTODY_EVENT_TYPES.HANDOVER_RECEIVED) actorLabel = institutionName || 'Verified NGO';
      else actorLabel = 'MediBridge Platform';
    }

    return {
      seq: evt.seq,
      type: evt.type,
      at: evt.at,
      actorLabel,
      institutionName: evt.organizationId?.name || null,
      meta: evt.meta || {},
      hash: evt.hash,
      shortHash: evt.hash.slice(0, 12),
    };
  });

  return {
    medicineId: medicine.medicineId,
    name: medicine.name,
    batchNumber: medicine.batchNumber,
    status: medicine.status,
    totalEvents: events.length,
    integrity,
    timeline,
  };
};

export default {
  recordEvent,
  verifyChain,
  buildTrace,
};
