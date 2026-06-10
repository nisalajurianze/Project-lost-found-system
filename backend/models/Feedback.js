// ============================================
// Feedback Model
// User feedback & ratings for the platform
// ============================================

import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    category: {
      type: String,
      enum: {
        values: ['general', 'bug_report', 'feature_request', 'complaint', 'praise'],
        message: 'Invalid feedback category',
      },
      default: 'general',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'reviewed', 'resolved'],
        message: 'Status must be pending, reviewed, or resolved',
      },
      default: 'pending',
      index: true,
    },
    adminResponse: {
      type: String,
      default: '',
      maxlength: [1000, 'Admin response cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ rating: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;
