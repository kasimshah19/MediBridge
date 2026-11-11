import mongoose from 'mongoose';
import {
  PRIORITY_LEVELS_ARRAY,
  REQUEST_STATUS,
  REQUEST_STATUS_ARRAY,
} from '../config/constants.js';

const requestSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    medicineName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    quantityNeeded: {
      type: Number,
      required: true,
      min: 1,
    },
    urgency: {
      type: String,
      enum: PRIORITY_LEVELS_ARRAY,
      default: 'normal',
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: REQUEST_STATUS_ARRAY,
      default: REQUEST_STATUS.OPEN,
      index: true,
    },
    matchedMedicineIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Request = mongoose.model('Request', requestSchema);

export default Request;
