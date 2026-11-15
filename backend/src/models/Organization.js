import mongoose from 'mongoose';
import {
  ORG_TYPE_ARRAY,
  ORG_STATUS,
  ORG_STATUS_ARRAY,
  ORG_DOC_TYPES_ARRAY,
  ORG_SERVICES_ARRAY,
} from '../config/constants.js';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ORG_TYPE_ARRAY,
      required: [true, 'Organization type is required'],
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      sparse: true,
      trim: true,
      set: (val) => (val ? val.trim().toUpperCase() : val),
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      trim: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    servicesOffered: [
      {
        type: String,
        enum: ORG_SERVICES_ARRAY,
      },
    ],
    beneficiariesPerMonth: {
      type: Number,
      min: 0,
      default: 0,
    },
    operatingHours: {
      type: String,
      trim: true,
      default: '',
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
    documents: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        type: {
          type: String,
          enum: ORG_DOC_TYPES_ARRAY,
          required: true,
        },
        originalName: {
          type: String,
          required: true,
          trim: true,
        },
        storedName: {
          type: String,
          required: true,
          select: false, // Hidden by default, only accessed by streaming controller
        },
        mimeType: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    verificationStatus: {
      type: String,
      enum: ORG_STATUS_ARRAY,
      default: ORG_STATUS.DRAFT,
      index: true,
    },
    verificationNote: {
      type: String,
      default: null,
      trim: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reviewHistory: [
      {
        decision: {
          type: String,
          enum: ['verified', 'rejected'],
          required: true,
        },
        note: {
          type: String,
          trim: true,
          default: '',
        },
        reviewerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One organization per NGO user
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// GeoJSON 2dsphere index for radius matching
organizationSchema.index({ location: '2dsphere' });

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
