import mongoose from 'mongoose';
import {
  VERIFICATION_DECISION,
  VERIFICATION_DECISION_ARRAY,
  REJECTION_REASON_CODES_ARRAY,
  MORE_INFO_REQUEST_TYPES_ARRAY,
} from '../config/constants.js';

const checklistSchema = new mongoose.Schema(
  {
    packagingIntact: { type: Boolean, default: false },
    batchReadable: { type: Boolean, default: false },
    expiryValid: { type: Boolean, default: false },
    storageReliable: { type: Boolean, default: false },
    authenticityEstablished: { type: Boolean, default: false },
    policyEligible: { type: Boolean, default: false },
  },
  { _id: false }
);

const snapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    batchNumber: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true },
    packagingCondition: { type: String, required: true },
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
      index: true,
    },
    pharmacistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    decision: {
      type: String,
      enum: VERIFICATION_DECISION_ARRAY,
      required: true,
      index: true,
    },
    reasonCode: {
      type: String,
      enum: [...REJECTION_REASON_CODES_ARRAY, null],
      default: null,
    },
    reason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    requestedTypes: [
      {
        type: String,
        enum: MORE_INFO_REQUEST_TYPES_ARRAY,
      },
    ],
    question: {
      type: String,
      default: null,
      maxlength: 500,
    },
    checklist: {
      type: checklistSchema,
      required: true,
      default: () => ({}),
    },
    snapshot: {
      type: snapshotSchema,
      required: true,
    },
    round: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
verificationSchema.index({ medicineId: 1, verifiedAt: -1 });
verificationSchema.index({ pharmacistId: 1, verifiedAt: -1 });

const Verification = mongoose.models.Verification || mongoose.model('Verification', verificationSchema);

export default Verification;
