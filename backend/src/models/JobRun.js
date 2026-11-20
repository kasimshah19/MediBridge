import mongoose from 'mongoose';

const jobRunSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    trigger: {
      type: String,
      enum: ['cron', 'github_actions', 'manual_admin', 'startup_catchup'],
      required: true,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dryRun: {
      type: Boolean,
      default: false,
    },
    asOf: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['running', 'success', 'failed'],
      default: 'running',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: null,
    },
    stats: {
      scanned: { type: Number, default: 0 },
      priorityChanged: { type: Number, default: 0 },
      newlyExpired: { type: Number, default: 0 },
      notificationsCreated: { type: Number, default: 0 },
      notificationsPurged: { type: Number, default: 0 },
      donationsAffected: { type: Number, default: 0 },
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound index for finding latest job runs
jobRunSchema.index({ name: 1, startedAt: -1 });

const JobRun = mongoose.models.JobRun || mongoose.model('JobRun', jobRunSchema);

export default JobRun;

