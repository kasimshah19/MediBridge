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
      required: true,
      unique: true,
      index: true,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
      },
    ],
    pickupAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
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
    status: {
      type: String,
      enum: DONATION_STATUS_ARRAY,
      default: DONATION_STATUS.SUBMITTED,
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    matchedOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

donationSchema.index({ location: '2dsphere' });

const Donation = mongoose.model('Donation', donationSchema);

export default Donation;
