// ============================================
// Lost Item Model
// Text index for search, soft-delete via pre-find
// ============================================

import mongoose from 'mongoose';

const lostItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    assistantSubmissionId: { type: mongoose.Schema.Types.ObjectId, default: null, unique: true, sparse: true },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [150, 'Item name cannot exceed 150 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    brand: { type: String, trim: true, maxlength: [100, 'Brand cannot exceed 100 characters'], default: '' },
    model: { type: String, trim: true, maxlength: [120, 'Model cannot exceed 120 characters'], default: '' },
    colors: {
      type: [String],
      default: [],
      validate: { validator: (values) => values.length <= 6, message: 'Maximum 6 colours allowed' },
    },
    material: { type: String, trim: true, maxlength: [100, 'Material cannot exceed 100 characters'], default: '' },
    uniqueFeatures: {
      type: [String],
      default: [],
      validate: { validator: (values) => values.length <= 12, message: 'Maximum 12 unique features allowed' },
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: '' },
          format: { type: String, default: '' },
          deliveryType: { type: String, enum: ['upload', 'authenticated'], default: 'upload' },
          privacyStatus: { type: String, enum: ['safe_public', 'legacy_unreviewed'], default: 'legacy_unreviewed' },
          originalAsset: {
            publicId: { type: String, default: '' },
            format: { type: String, default: '' },
            deliveryType: { type: String, enum: ['authenticated'], default: 'authenticated' },
          },
        },
      ],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: 'Maximum 5 images allowed',
      },
      default: [],
    },
    lostLocation: {
      type: String,
      required: [true, 'Lost location is required'],
      trim: true,
      maxlength: [300, 'Location cannot exceed 300 characters'],
    },
    locationIntelligence: {
      canonicalId: { type: String, default: '', maxlength: 80 },
      canonicalName: { type: String, default: '', maxlength: 200 },
      area: { type: String, default: '', maxlength: 120 },
      verificationStatus: { type: String, default: '', maxlength: 50 },
      sensitivity: { type: String, default: '', maxlength: 30 },
      confidence: { type: Number, min: 0, max: 100, default: 0 },
      needsReview: { type: Boolean, default: true },
    },
    lostDate: {
      type: Date,
      required: [true, 'Lost date is required'],
      validate: {
        validator: function (value) {
          // Allow up to +24 hours to account for timezone differences
          return value <= new Date(Date.now() + 24 * 60 * 60 * 1000);
        },
        message: 'Lost date cannot be in the future',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'matched', 'in_progress', 'claimed', 'closed'],
        message: 'Status must be pending, matched, in_progress, claimed, or closed',
      },
      default: 'pending',
      index: true,
    },
    connectedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    connectedAt: {
      type: Date,
      default: null,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    aiKeywords: {
      type: [String],
      default: [],
      index: true
    },
    reportQuality: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      level: { type: String, enum: ['weak', 'fair', 'good', 'excellent'], default: 'weak' },
      missingFields: { type: [String], default: [] },
      suggestions: { type: [String], default: [] },
      assessedAt: { type: Date, default: null },
      policy: { type: String, default: 'advisory-only' },
    },
    duplicateCandidates: {
      type: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        itemType: { type: String, enum: ['LostItem', 'FoundItem'], required: true },
        score: { type: Number, min: 0, max: 100, required: true },
        reasons: { type: [String], default: [] },
      }],
      default: [],
    },
    contactPreference: {
      type: String,
      enum: ['email', 'phone', 'both'],
      default: 'email',
    },
    contactVisibility: {
      type: String,
      enum: ['public', 'request_only'],
      default: 'request_only',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────
// Full-text search index across key searchable fields
lostItemSchema.index(
  { itemName: 'text', description: 'text', brand: 'text', model: 'text', uniqueFeatures: 'text', lostLocation: 'text' },
  {
    weights: { itemName: 10, brand: 8, model: 8, uniqueFeatures: 6, description: 5, lostLocation: 3 },
    name: 'lost_items_text_search',
  }
);

lostItemSchema.index({ category: 1, status: 1 });
lostItemSchema.index({ status: 1, isDeleted: 1 });
lostItemSchema.index({ lostDate: -1 });
lostItemSchema.index({ createdAt: -1 });
lostItemSchema.index({ category: 1, status: 1, isDeleted: 1, isArchived: 1, lostDate: -1 });

// ── Pre-find middleware: auto-exclude soft-deleted docs ──────────────────
const autoExcludeDeleted = function (next) {
  // Only add filter if isDeleted isn't explicitly queried
  if (this.getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
};

lostItemSchema.pre('find', autoExcludeDeleted);
lostItemSchema.pre('findOne', autoExcludeDeleted);
lostItemSchema.pre('findOneAndUpdate', autoExcludeDeleted);
lostItemSchema.pre('countDocuments', autoExcludeDeleted);

// ── Virtual: populate user info ─────────────────────────────────────────
lostItemSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

const LostItem = mongoose.model('LostItem', lostItemSchema);
export default LostItem;
