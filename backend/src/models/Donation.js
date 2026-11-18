import mongoose from 'mongoose';
import { DONATION_STATUS, DONATION_STATUS_ARRAY } from '../config/constants.js';

const donationSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    donationCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
      },
    ],
    status: {
      type: String,
      enum: DONATION_STATUS_ARRAY,
      default: DONATION_STATUS.DRAFT,
      index: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: DONATION_STATUS_ARRAY,
          required: true,
        },
        note: {
          type: String,
          trim: true,
        },
        at: {
          type: Date,
          default: Date.now,
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    pickupAddress: {
      line1: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    preferredTimeSlot: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      maxlength: 300,
      trim: true,
      default: '',
    },
    declarations: {
      sealedAndUnused: { type: Boolean, default: false },
      storedProperly: { type: Boolean, default: false },
      notControlled: { type: Boolean, default: false },
      genuineInfo: { type: Boolean, default: false },
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
      default: null,
    },
    matchedOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    matchedOrganizationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
      },
    ],
    review: {
      claimedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      claimedAt: {
        type: Date,
        default: null,
      },
      claimExpiresAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

donationSchema.index({ location: '2dsphere' });
donationSchema.index({ status: 1, submittedAt: 1 });

const Donation = mongoose.models.Donation || mongoose.model('Donation', donationSchema);

export default Donation;
