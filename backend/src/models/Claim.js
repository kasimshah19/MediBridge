import mongoose from 'mongoose';
import {
  CLAIM_STATUS,
  CLAIM_STATUS_ARRAY,
  CLAIM_INITIATOR,
  CLAIM_INITIATOR_ARRAY,
} from '../config/constants.js';

const itemSnapshotSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    name: { type: String, required: true },
    batchNumber: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema(
  {
    claimCode: {
      type: String,
      unique: true,
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
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    medicineIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true,
      },
    ],
    itemsSnapshot: [itemSnapshotSchema],
    initiatedBy: {
      type: String,
      enum: CLAIM_INITIATOR_ARRAY,
      required: true,
    },
    initiatedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      default: null,
      index: true,
    },
    message: {
      type: String,
      maxlength: 300,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: CLAIM_STATUS_ARRAY,
      default: CLAIM_STATUS.PENDING,
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String, trim: true, default: '' },
        at: { type: Date, default: Date.now },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    responseNote: {
      type: String,
      trim: true,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
      default: null,
    },
    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
claimSchema.index({ organizationId: 1, status: 1 });
claimSchema.index({ donorId: 1, status: 1 });
claimSchema.index({ donationId: 1, status: 1 });
claimSchema.index({ status: 1, expiresAt: 1 });

// Partial unique index preventing an organization from holding two concurrent active claims on the same donation
claimSchema.index(
  { organizationId: 1, donationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [CLAIM_STATUS.PENDING, CLAIM_STATUS.ACCEPTED] },
    },
  }
);

const Claim = mongoose.models.Claim || mongoose.model('Claim', claimSchema);

export default Claim;
