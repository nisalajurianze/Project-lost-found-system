// ============================================
// Category Model
// Pre-defined item categories with emoji icons
// ============================================

import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    icon: {
      type: String,
      default: '📦',
      maxlength: [10, 'Icon cannot exceed 10 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    itemCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────
categorySchema.index({ isActive: 1, name: 1 });

const Category = mongoose.model('Category', categorySchema);
export default Category;
