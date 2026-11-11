import mongoose from 'mongoose';
import { TRANSFER_STATUS, TRANSFER_STATUS_ARRAY } from '../config/constants.js';

const transferSchema = new mongoose.Schema(
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
    fromDonorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    qrIdentifier: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    handoverAt: {
      type: Date,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: TRANSFER_STATUS_ARRAY,
      default: TRANSFER_STATUS.SCHEDULED,
      index: true,
    },
    remarks: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Transfer = mongoose.model('Transfer', transferSchema);

export default Transfer;
