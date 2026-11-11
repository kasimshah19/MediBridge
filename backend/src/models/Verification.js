import mongoose from 'mongoose';
import {
  VERIFICATION_DECISION,
  VERIFICATION_DECISION_ARRAY,
} from '../config/constants.js';

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
    reason: {
      type: String,
      default: null,
    },
    checklist: {
      packagingIntact: { type: Boolean, default: false },
      batchReadable: { type: Boolean, default: false },
      expiryValid: { type: Boolean, default: false },
      storageReliable: { type: Boolean, default: false },
      authenticityEstablished: { type: Boolean, default: false },
      policyEligible: { type: Boolean, default: false },
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Verification = mongoose.model('Verification', verificationSchema);

export default Verification;
