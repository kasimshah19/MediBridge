import mongoose from 'mongoose';
import {
  REQUIREMENT_URGENCY,
  REQUIREMENT_URGENCY_ARRAY,
  REQUEST_STATUS,
  REQUEST_STATUS_ARRAY,
  MEDICINE_UNIT,
  MEDICINE_UNIT_ARRAY,
} from '../config/constants.js';

const requestSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    medicineName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 80,
      trim: true,
    },
    genericName: {
      type: String,
      maxlength: 80,
      trim: true,
      default: '',
    },
    medicineNameLower: {
      type: String,
      trim: true,
      index: true,
    },
    quantityNeeded: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      enum: MEDICINE_UNIT_ARRAY,
      default: MEDICINE_UNIT.STRIP,
      required: true,
    },
    urgency: {
      type: String,
      enum: REQUIREMENT_URGENCY_ARRAY,
      default: REQUIREMENT_URGENCY.ROUTINE,
      index: true,
    },
    description: {
      type: String,
      maxlength: 300,
      trim: true,
      default: '',
    },
    neededBy: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: REQUEST_STATUS_ARRAY,
      default: REQUEST_STATUS.OPEN,
      index: true,
    },
    fulfilledQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        note: {
          type: String,
          trim: true,
          default: '',
        },
        at: {
          type: Date,
          default: Date.now,
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
      },
    ],
    closedReason: {
      type: String,
      trim: true,
      default: null,
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

// Auto-populate medicineNameLower before validation/saving
requestSchema.pre('validate', function (next) {
  if (this.medicineName) {
    this.medicineNameLower = this.medicineName.toLowerCase().trim();
  }
  next();
});

// Indexes for high performance NGO requirements discovery
requestSchema.index({ organizationId: 1, status: 1 });
requestSchema.index({ status: 1, urgency: 1, neededBy: 1 });

const Request = mongoose.models.Request || mongoose.model('Request', requestSchema);

export default Request;
