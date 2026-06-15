// ============================================
// Found Item Model
// Mirrors LostItem with found-specific fields
// ============================================

import mongoose from 'mongoose';

const foundItemSchema = new mongoose.Schema(
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
    foundLocation: {
      type: String,
      required: [true, 'Found location is required'],
      trim: true,
      maxlength: [300, 'Location cannot exceed 300 characters'],
    },
    foundDate: {
      type: Date,
      required: [true, 'Found date is required'],
      validate: {
        validator: function (value) {
          // Allow up to +24 hours to account for timezone differences
          return value <= new Date(Date.now() + 24 * 60 * 60 * 1000);
        },
        message: 'Found date cannot be in the future',
      },
    },
    storedAt: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Storage location cannot exceed 300 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'matched', 'claimed'],
        message: 'Status must be available, matched, or claimed',
      },
      default: 'available',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────
foundItemSchema.index(
  { itemName: 'text', description: 'text', foundLocation: 'text' },
  {
    weights: { itemName: 10, description: 5, foundLocation: 3 },
    name: 'found_items_text_search',
  }
);

foundItemSchema.index({ category: 1, status: 1 });
foundItemSchema.index({ status: 1, isDeleted: 1 });
foundItemSchema.index({ foundDate: -1 });
foundItemSchema.index({ createdAt: -1 });

// ── Pre-find middleware: auto-exclude soft-deleted docs ──────────────────
const autoExcludeDeleted = function (next) {
  if (this.getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
};

foundItemSchema.pre('find', autoExcludeDeleted);
foundItemSchema.pre('findOne', autoExcludeDeleted);
foundItemSchema.pre('findOneAndUpdate', autoExcludeDeleted);
foundItemSchema.pre('countDocuments', autoExcludeDeleted);

// ── Virtual: populate user info ─────────────────────────────────────────
foundItemSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

const FoundItem = mongoose.model('FoundItem', foundItemSchema);
export default FoundItem;
