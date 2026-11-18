import mongoose from 'mongoose';
import crypto from 'crypto';
import { CUSTODY_EVENT_TYPES_ARRAY } from '../config/constants.js';

/**
 * Deterministic JSON stringifier with alphabetically sorted keys.
 * Ensures consistent SHA-256 hashing regardless of object property insertion order.
 */
export const canonicalJSON = (obj) => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJSON).join(',') + ']';
  }
  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => {
    const val = obj[key];
    return JSON.stringify(key) + ':' + canonicalJSON(val);
  });
  return '{' + pairs.join(',') + '}';
};

/**
 * Computes the SHA-256 hash for a custody event in the hash chain.
 * Formula: SHA-256(prevHash + "|" + canonicalJSON({ seq, medicineCode, type, at, actorType, actorUserId, actorRole, organizationId, meta }))
 */
export const computeCustodyEventHash = (prevHash, payload) => {
  const dateVal = payload.at || payload.timestamp || new Date();
  const atIso = dateVal instanceof Date ? dateVal.toISOString() : new Date(dateVal).toISOString();
  const canonicalPayload = {
    seq: payload.seq,
    medicineCode: payload.medicineCode || (payload.medicineId ? String(payload.medicineId) : ''),
    type: payload.type || payload.eventType || '',
    at: atIso,
    actorType: payload.actorType || (payload.actorRole === 'system' ? 'system' : 'user'),
    actorUserId: payload.actorUserId
      ? String(payload.actorUserId)
      : payload.actorId
      ? String(payload.actorId)
      : null,
    actorRole: payload.actorRole || 'system',
    organizationId: payload.organizationId ? String(payload.organizationId) : null,
    meta: payload.meta || payload.data || {},
  };

  const payloadString = canonicalJSON(canonicalPayload);
  const dataToHash = `${prevHash}|${payloadString}`;
  return crypto.createHash('sha256').update(dataToHash).digest('hex');
};

const custodyEventSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    medicineCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
      index: true,
    },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transfer',
      default: null,
      index: true,
    },
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
      default: null,
      index: true,
    },
    seq: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: CUSTODY_EVENT_TYPES_ARRAY,
      required: true,
      index: true,
    },
    actorType: {
      type: String,
      enum: ['user', 'system'],
      default: 'user',
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorRole: {
      type: String,
      default: 'system',
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    prevHash: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },
  },
  {
    collection: 'custodyevents',
    timestamps: false,
    versionKey: false,
  }
);

// Unique index: each medicine has sequential 1, 2, 3...
custodyEventSchema.index({ medicineId: 1, seq: 1 }, { unique: true });
custodyEventSchema.index({ donationId: 1, at: 1 });
custodyEventSchema.index({ transferId: 1, at: 1 });

/**
 * STRICT IMMUTABILITY GUARDS:
 * Block any update, replace, or delete operations at schema level.
 */
const throwImmutableError = () => {
  throw new Error('CustodyEvent is append-only and immutable. Edits and deletions are prohibited.');
};

custodyEventSchema.pre('updateOne', throwImmutableError);
custodyEventSchema.pre('updateMany', throwImmutableError);
custodyEventSchema.pre('findOneAndUpdate', throwImmutableError);
custodyEventSchema.pre('replaceOne', throwImmutableError);
custodyEventSchema.pre('findOneAndReplace', throwImmutableError);
custodyEventSchema.pre('deleteOne', throwImmutableError);
custodyEventSchema.pre('deleteMany', throwImmutableError);
custodyEventSchema.pre('findOneAndDelete', throwImmutableError);
custodyEventSchema.pre('findByIdAndDelete', throwImmutableError);
custodyEventSchema.pre('findByIdAndUpdate', throwImmutableError);

const CustodyEvent =
  mongoose.models.CustodyEvent || mongoose.model('CustodyEvent', custodyEventSchema);

export default CustodyEvent;
