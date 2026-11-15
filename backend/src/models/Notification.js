import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      default: 'system',
      enum: ['system', 'verification', 'donation', 'transfer', 'alert'],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    link: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for high-performance notification querying
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
