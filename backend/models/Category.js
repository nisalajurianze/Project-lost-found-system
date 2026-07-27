import mongoose from 'mongoose';

const normalizeCategoryName = (value) => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
  },
  normalizedName: {
    type: String,
    required: true,
    unique: true,
    index: true,
    select: false,
  },
  icon: { type: String, default: '📦', maxlength: [10, 'Icon cannot exceed 10 characters'] },
  description: { type: String, default: '', trim: true, maxlength: [300, 'Description cannot exceed 300 characters'] },
  isActive: { type: Boolean, default: true, index: true },
  itemCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

categorySchema.pre('validate', function setNormalizedName(next) {
  this.name = String(this.name || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  this.normalizedName = normalizeCategoryName(this.name);
  next();
});
categorySchema.index({ isActive: 1, name: 1 });

export { normalizeCategoryName };
export default mongoose.model('Category', categorySchema);
