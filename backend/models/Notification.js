// ============================================
// Notification Model
// In-app notifications with socket delivery
// ============================================

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: {
        values: [
          'match_found',
          'claim_submitted',
          'claim_approved',
          'claim_rejected',
          'item_update',
          'system',
          'welcome',
        ],
        message: 'Invalid notification type',
      },
      default: 'system',
      index: true,
    },
    relatedItem: {
      itemType: {
        type: String,
        enum: ['LostItem', 'FoundItem', 'Match', 'ClaimRequest'],
        default: null,
      },
      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
