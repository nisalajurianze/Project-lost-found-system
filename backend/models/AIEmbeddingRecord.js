import mongoose from 'mongoose';

const aiEmbeddingRecordSchema = new mongoose.Schema({
  targetType: { type: String, enum: ['LostItem', 'FoundItem', 'AIKnowledgeArticle'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetVersion: { type: String, required: true, maxlength: 80 },
  documentChecksum: { type: String, required: true, maxlength: 64 },
  model: { type: String, required: true, maxlength: 100 },
  dimensions: { type: Number, required: true, min: 8, max: 4096 },
  vector: { type: [Number], required: true, select: false },
  status: { type: String, enum: ['ready', 'stale', 'failed', 'deleted'], default: 'ready', index: true },
  lastErrorCode: { type: String, default: '', maxlength: 100 },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

aiEmbeddingRecordSchema.index({ targetType: 1, targetId: 1, targetVersion: 1 }, { unique: true });
aiEmbeddingRecordSchema.index({ status: 1, generatedAt: -1 });

export default mongoose.model('AIEmbeddingRecord', aiEmbeddingRecordSchema);
