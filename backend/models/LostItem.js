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
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: '' },
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
    contactPreference: {
      type: String,
      enum: ['email', 'phone', 'both'],
      default: 'email',
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
  { itemName: 'text', description: 'text', lostLocation: 'text' },
  {
    weights: { itemName: 10, description: 5, lostLocation: 3 },
    name: 'lost_items_text_search',
  }
);

lostItemSchema.index({ category: 1, status: 1 });
lostItemSchema.index({ status: 1, isDeleted: 1 });
lostItemSchema.index({ lostDate: -1 });
lostItemSchema.index({ createdAt: -1 });

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
