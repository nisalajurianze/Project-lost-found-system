// ============================================
// Match Model
// AI/algorithm-generated matches between lost & found items
// ============================================

import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    lostItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LostItem',
      required: [true, 'Lost item ID is required'],
      index: true,
    },
    foundItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoundItem',
      required: [true, 'Found item ID is required'],
      index: true,
    },
    lostUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lost item user ID is required'],
      index: true,
    },
    foundUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Found item user ID is required'],
      index: true,
    },
    similarityScore: {
      type: Number,
      required: [true, 'Similarity score is required'],
      min: [0, 'Score cannot be below 0'],
      max: [100, 'Score cannot exceed 100'],
    },
    confidencePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    reason: {
      type: String,
      default: '',
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    aiSummary: {
      type: String,
      default: '',
      maxlength: [2000, 'AI summary cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['suggested', 'confirmed', 'rejected'],
        message: 'Status must be suggested, confirmed, or rejected',
      },
      default: 'suggested',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Compound unique index: one match per lost-found pair ────────────────
matchSchema.index({ lostItemId: 1, foundItemId: 1 }, { unique: true });
matchSchema.index({ similarityScore: -1 });
matchSchema.index({ createdAt: -1 });

const Match = mongoose.model('Match', matchSchema);
export default Match;
