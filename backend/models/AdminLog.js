// ============================================
// Admin Log Model
// Audit trail for all admin actions
// ============================================

import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin ID is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      maxlength: [200, 'Action cannot exceed 200 characters'],
    },
    targetModel: {
      type: String,
      enum: {
        values: [
          'User',
          'LostItem',
          'FoundItem',
          'Match',
          'ClaimRequest',
          'Category',
          'Feedback',
          'System',
        ],
        message: 'Invalid target model',
      },
      required: [true, 'Target model is required'],
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    details: {
      type: String,
      default: '',
      maxlength: [2000, 'Details cannot exceed 2000 characters'],
    },
    ipAddress: {
      type: String,
      default: '',
    },
    previousData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────
adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ targetModel: 1, targetId: 1 });

const AdminLog = mongoose.model('AdminLog', adminLogSchema);
export default AdminLog;
