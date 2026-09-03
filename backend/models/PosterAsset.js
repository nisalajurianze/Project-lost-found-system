import mongoose from 'mongoose';

const posterAssetSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportType: { type: String, enum: ['LostItem', 'FoundItem'], required: true },
  reportId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  template: { type: String, enum: ['privacy-safe-v1'], default: 'privacy-safe-v1' },
  language: { type: String, enum: ['en', 'si', 'ta', 'singlish'], default: 'en' },
  safeFields: { type: [String], default: [] },
  safeImageUrl: { type: String, default: '', maxlength: 700 },
  deepLink: { type: String, required: true, maxlength: 700 },
  svgChecksum: { type: String, required: true, maxlength: 64 },
  status: { type: String, enum: ['preview', 'approved', 'expired', 'deleted'], default: 'preview', index: true },
  approvedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

posterAssetSchema.index({ reportType: 1, reportId: 1, language: 1, status: 1 });
export default mongoose.model('PosterAsset', posterAssetSchema);
