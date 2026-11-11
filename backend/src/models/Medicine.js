import mongoose from 'mongoose';
import {
  MEDICINE_STATUS,
  MEDICINE_STATUS_ARRAY,
  MEDICINE_TYPE,
  MEDICINE_TYPE_ARRAY,
  PACKAGING_CONDITION,
  PACKAGING_CONDITION_ARRAY,
  PRIORITY_LEVELS,
  PRIORITY_LEVELS_ARRAY,
} from '../config/constants.js';

const medicineSchema = new mongoose.Schema(
  {
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
    medicineId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    genericName: {
      type: String,
      trim: true,
      default: '',
    },
    manufacturer: {
      type: String,
      trim: true,
      default: '',
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      required: true,
      default: 'strips',
    },
    medicineType: {
      type: String,
      enum: MEDICINE_TYPE_ARRAY,
      default: MEDICINE_TYPE.TABLET,
    },
    packagingCondition: {
      type: String,
      enum: PACKAGING_CONDITION_ARRAY,
      default: PACKAGING_CONDITION.SEALED,
    },
    storageHistory: {
      type: String,
      default: 'standard_room_temperature',
    },
    photos: [
      {
        url: { type: String, required: true },
        caption: { type: String, default: '' },
      },
    ],
    priority: {
      type: String,
      enum: PRIORITY_LEVELS_ARRAY,
      default: PRIORITY_LEVELS.NORMAL,
    },
    status: {
      type: String,
      enum: MEDICINE_STATUS_ARRAY,
      default: MEDICINE_STATUS.PENDING,
      index: true,
    },
    qrCode: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Medicine = mongoose.model('Medicine', medicineSchema);

export default Medicine;
