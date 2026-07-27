// ============================================
// Image Analysis Model
// Stores privacy-safe AI-generated image metadata
// ============================================

import mongoose from 'mongoose';

const normalizedRegionSchema = new mongoose.Schema({
  x: { type: Number, min: 0, max: 1, required: true },
  y: { type: Number, min: 0, max: 1, required: true },
  width: { type: Number, min: 0, max: 1, required: true },
  height: { type: Number, min: 0, max: 1, required: true },
  reason: { type: String, maxlength: 80, default: 'sensitive-text' },
}, { _id: false });

const imageAnalysisSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: { values: ['LostItem', 'FoundItem'], message: 'Item type must be LostItem or FoundItem' },
      required: [true, 'Item type is required'],
      index: true,
    },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: [true, 'Item ID is required'], index: true },
    imageUrl: { type: String, required: [true, 'Image URL is required'] },
    labels: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    brand: { type: String, default: '', maxlength: 100 },
    model: { type: String, default: '', maxlength: 120 },
    material: { type: String, default: '', maxlength: 100 },
    uniqueMarks: { type: [String], default: [] },
    visibleTextMasked: { type: [String], default: [] },
    privacyFlags: { type: [String], default: [] },
    redactionRegions: { type: [normalizedRegionSchema], default: [] },
    imageQuality: {
      type: String,
      enum: ['unknown', 'poor', 'fair', 'good'],
      default: 'unknown',
    },
    moderationDecision: {
      type: String,
      enum: ['allow', 'review', 'reject'],
      default: 'allow',
      index: true,
    },
    description: { type: String, default: '', maxlength: [1000, 'Description cannot exceed 1000 characters'] },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    provider: {
      type: String,
      enum: ['ai', 'openai', 'gemini', 'openrouter', 'fallback'],
      default: 'fallback',
    },
    providerModel: { type: String, default: '', maxlength: 150 },
    providerLatencyMs: { type: Number, min: 0, default: 0 },
    analysisVersion: { type: String, default: 'vision-v2', maxlength: 40 },
  },
  { timestamps: true }
);

imageAnalysisSchema.index({ itemType: 1, itemId: 1 }, { unique: true });
imageAnalysisSchema.index({ createdAt: -1 });
imageAnalysisSchema.index({ moderationDecision: 1, createdAt: -1 });

const ImageAnalysis = mongoose.model('ImageAnalysis', imageAnalysisSchema);
export default ImageAnalysis;
