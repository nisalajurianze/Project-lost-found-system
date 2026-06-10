// ============================================
// Image Analysis Model
// Stores AI-generated image metadata & labels
// ============================================

import mongoose from 'mongoose';

const imageAnalysisSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: {
        values: ['LostItem', 'FoundItem'],
        message: 'Item type must be LostItem or FoundItem',
      },
      required: [true, 'Item type is required'],
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Item ID is required'],
      index: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    labels: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    provider: {
      type: String,
      enum: ['openai', 'gemini', 'fallback'],
      default: 'fallback',
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      select: false, // Don't include raw AI response in queries by default
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────
imageAnalysisSchema.index({ itemType: 1, itemId: 1 });
imageAnalysisSchema.index({ createdAt: -1 });

const ImageAnalysis = mongoose.model('ImageAnalysis', imageAnalysisSchema);
export default ImageAnalysis;
