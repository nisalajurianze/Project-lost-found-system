import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  score: { type: Number, min: 0, max: 100, required: true },
  lexicalScore: { type: Number, min: 0, max: 100, default: 0 },
  semanticScore: { type: Number, min: 0, max: 100, default: 0 },
  visualScore: { type: Number, min: 0, max: 100, default: 0 },
  reasons: { type: [String], default: [] },
}, { _id: false });

const duplicateReviewClusterSchema = new mongoose.Schema({
  clusterKey: { type: String, required: true, unique: true, maxlength: 100 },
  itemType: { type: String, enum: ['LostItem', 'FoundItem'], required: true },
  sourceItemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  sourceUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  candidates: { type: [candidateSchema], default: [] },
  accountCount: { type: Number, min: 1, default: 1 },
  reportVelocity24h: { type: Number, min: 0, default: 0 },
  riskScore: { type: Number, min: 0, max: 100, default: 0 },
  signals: { type: [String], default: [] },
  status: { type: String, enum: ['pending', 'dismissed', 'confirmed-duplicate'], default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, maxlength: 1000, default: '' },
  policy: { type: String, default: 'human-review-only-never-auto-ban', immutable: true },
}, { timestamps: true });

duplicateReviewClusterSchema.index({ status: 1, riskScore: -1, createdAt: -1 });
export default mongoose.model('DuplicateReviewCluster', duplicateReviewClusterSchema);
