import mongoose from 'mongoose';
import {
  MEDICINE_STATUS,
  MEDICINE_STATUS_ARRAY,
  MEDICINE_TYPE,
  MEDICINE_TYPE_ARRAY,
  PACKAGING_CONDITION,
  PACKAGING_CONDITION_ARRAY,
  STORAGE_CONDITION,
  STORAGE_CONDITION_ARRAY,
  MEDICINE_UNIT,
  MEDICINE_UNIT_ARRAY,
  PRIORITY_LEVELS,
  PRIORITY_LEVELS_ARRAY,
  REJECTION_SOURCES_ARRAY,
} from '../config/constants.js';

const photoSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true, trim: true },
    storedName: { type: String, required: true, select: false },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const screeningReasonSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    message: { type: String, required: true },
  },
  { _id: false }
);

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
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    nameLower: {
      type: String,
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
      uppercase: true,
      trim: true,
    },
    manufacturingDate: {
      type: Date,
      default: null,
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
      enum: MEDICINE_UNIT_ARRAY,
      default: MEDICINE_UNIT.STRIP,
    },
    unitsPerPack: {
      type: Number,
      default: null,
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
    storageCondition: {
      type: String,
      enum: STORAGE_CONDITION_ARRAY,
      default: STORAGE_CONDITION.ROOM_TEMPERATURE,
    },
    storageHistory: {
      type: String,
      maxlength: 300,
      trim: true,
      default: '',
    },
    isPrescriptionOnly: {
      type: Boolean,
      default: false,
    },
    photos: [photoSchema],
    priority: {
      type: String,
      enum: PRIORITY_LEVELS_ARRAY,
      default: PRIORITY_LEVELS.NORMAL,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
    expiryCheckedAt: {
      type: Date,
      default: null,
    },
    expiryAlerts: {
      d90At: { type: Date, default: null },
      d30At: { type: Date, default: null },
      d7At: { type: Date, default: null },
      expiredAt: { type: Date, default: null },
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String, default: '' },
        at: { type: Date, default: Date.now },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
      },
    ],
    status: {
      type: String,
      enum: MEDICINE_STATUS_ARRAY,
      default: MEDICINE_STATUS.PENDING,
      index: true,
    },
    screening: {
      status: {
        type: String,
        enum: ['passed', 'rejected', 'not_checked'],
        default: 'not_checked',
      },
      reasons: [screeningReasonSchema],
      checkedAt: {
        type: Date,
        default: null,
      },
    },
    rejectionSource: {
      type: String,
      enum: [...REJECTION_SOURCES_ARRAY, null],
      default: null,
    },
    rejectionReasonText: {
      type: String,
      trim: true,
      default: null,
    },
    version: {
      type: Number,
      default: 0,
    },
    verificationState: {
      latestVerificationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Verification',
        default: null,
      },
      round: {
        type: Number,
        default: 0,
      },
      moreInfo: {
        question: { type: String, default: null },
        requestedTypes: [{ type: String }],
        requestedAt: { type: Date, default: null },
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        donorResponse: {
          message: { type: String, default: null },
          respondedAt: { type: Date, default: null },
        },
      },
    },
    qrCode: {
      type: String,
      default: null,
    },
    reservation: {
      type: {
        claimId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Claim',
          default: null,
        },
        organizationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Organization',
          default: null,
        },
        reservedAt: {
          type: Date,
          default: null,
        },
      },
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save to ensure nameLower is always synced
medicineSchema.pre('save', function (next) {
  if (this.name) {
    this.nameLower = this.name.toLowerCase().trim();
  }
  if (this.batchNumber) {
    this.batchNumber = this.batchNumber.toUpperCase().trim();
  }
  next();
});

// Compound index for duplicate detection
medicineSchema.index({ donorId: 1, nameLower: 1, batchNumber: 1, expiryDate: 1 });
medicineSchema.index({ status: 1, expiryDate: 1 });
medicineSchema.index({ priority: 1, status: 1 });

const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);

export default Medicine;
