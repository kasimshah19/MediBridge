import mongoose from 'mongoose';
import { AUDIT_ACTIONS_ARRAY } from '../config/constants.js';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorType: {
      type: String,
      enum: ['user', 'system'],
      default: 'user',
      index: true,
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS_ARRAY,
      required: true,
      index: true,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // Do not auto-add updatedAt since audit logs are append-only
    versionKey: false,
  }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
