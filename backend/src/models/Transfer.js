import mongoose from 'mongoose';
import {
  TRANSFER_STATUS,
  TRANSFER_STATUS_ARRAY,
  TRANSFER_ITEM_STATUS,
  TRANSFER_ITEM_STATUS_ARRAY,
  RECEIPT_REJECTION_CODES_ARRAY,
} from '../config/constants.js';

const transferItemSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    medicineCode: {
      type: String,
      required: true,
      trim: true,
    },
    snapshot: {
      name: { type: String, required: true },
      batchNumber: { type: String, required: true },
      expiryDate: { type: Date, required: true },
      quantity: { type: Number, required: true },
      unit: { type: String, required: true },
    },
    status: {
      type: String,
      enum: TRANSFER_ITEM_STATUS_ARRAY,
      default: TRANSFER_ITEM_STATUS.PENDING,
      required: true,
    },
    receivedQuantity: {
      type: Number,
      default: null,
      min: 1,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    checklist: {
      packagingIntact: { type: Boolean, default: false },
      batchMatches: { type: Boolean, default: false },
      expiryMatches: { type: Boolean, default: false },
      quantityMatches: { type: Boolean, default: false },
    },
    labelVerified: {
      type: Boolean,
      default: false,
    },
    reasonCode: {
      type: String,
      enum: [...RECEIPT_REJECTION_CODES_ARRAY, null],
      default: null,
    },
    note: {
      type: String,
      maxlength: 300,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const transferSchema = new mongoose.Schema(
  {
    transferCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
      required: true,
      unique: true,
      index: true,
    },
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
      index: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    items: [transferItemSchema],
    status: {
      type: String,
      enum: TRANSFER_STATUS_ARRAY,
      default: TRANSFER_STATUS.SCHEDULED,
      required: true,
      index: true,
    },
    handoverToken: {
      hash: {
        type: String,
        select: false,
        default: null,
      },
      issuedAt: {
        type: Date,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      attempts: {
        type: Number,
        default: 0,
      },
      usedAt: {
        type: Date,
        default: null,
      },
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
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
    reminderSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'transfers',
  }
);

transferSchema.index({ donorId: 1, status: 1 });
transferSchema.index({ organizationId: 1, status: 1 });
transferSchema.index({ status: 1, createdAt: -1 });

const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);

export default Transfer;
