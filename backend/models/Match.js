// ============================================
// Match Model
// Explainable algorithm-generated matches between lost & found items
// ============================================

import mongoose from 'mongoose';

const dimensionSchema = new mongoose.Schema({
  key: { type: String, required: true, maxlength: 50 },
  label: { type: String, required: true, maxlength: 100 },
  score: { type: Number, min: 0, max: 100, required: true },
  weight: { type: Number, min: 0, max: 100, required: true },
  contribution: { type: Number, min: 0, max: 100, required: true },
  evidenceAvailable: { type: Boolean, default: false },
  explanation: { type: String, maxlength: 300, default: '' },
}, { _id: false });

const locationContextSchema = new mongoose.Schema({
  left: {
    id: { type: String, default: '' },
    canonicalName: { type: String, default: '' },
    area: { type: String, default: '' },
    verificationStatus: { type: String, default: '' },
    sensitivity: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
  },
  right: {
    id: { type: String, default: '' },
    canonicalName: { type: String, default: '' },
    area: { type: String, default: '' },
    verificationStatus: { type: String, default: '' },
    sensitivity: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
  },
}, { _id: false });

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
    confidencePercentage: { type: Number, min: 0, max: 100, default: 0 },
    confidenceBand: {
      type: String,
      enum: ['weak', 'possible', 'strong', 'very-strong'],
      default: 'weak',
      index: true,
    },
    evidenceQuality: { type: Number, min: 0, max: 100, default: 0 },
    reason: { type: String, default: '', maxlength: [1000, 'Reason cannot exceed 1000 characters'] },
    explanations: { type: [String], default: [] },
    dimensionScores: { type: [dimensionSchema], default: [] },
    locationContext: { type: locationContextSchema, default: undefined },
    aiSummary: { type: String, default: '', maxlength: [2000, 'AI summary cannot exceed 2000 characters'] },
    algorithmVersion: { type: String, default: 'matching-v3', maxlength: 40 },
    notifiedAt: { type: Date, default: null },
    lastEvaluatedAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: { values: ['suggested', 'confirmed', 'rejected'], message: 'Status must be suggested, confirmed, or rejected' },
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

matchSchema.index({ lostItemId: 1, foundItemId: 1 }, { unique: true });
matchSchema.index({ similarityScore: -1 });
matchSchema.index({ confidenceBand: 1, similarityScore: -1 });
matchSchema.index({ createdAt: -1 });

const Match = mongoose.model('Match', matchSchema);
export default Match;
