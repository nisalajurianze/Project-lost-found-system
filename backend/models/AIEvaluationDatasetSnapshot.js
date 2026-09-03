import mongoose from 'mongoose';

const datasetEntrySchema = new mongoose.Schema({
  feedbackId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: ['Match'], required: true },
  label: { type: String, enum: ['confirmed', 'not-same'], required: true },
  score: { type: Number, min: 0, max: 100, required: true },
  algorithmVersion: { type: String, maxlength: 50, default: '' },
}, { _id: false });

const snapshotSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120, immutable: true },
  version: { type: String, required: true, maxlength: 60, immutable: true },
  checksum: { type: String, required: true, maxlength: 64, unique: true, immutable: true },
  sourcePolicy: { type: String, default: 'admin-approved-feedback-only', immutable: true },
  entries: { type: [datasetEntrySchema], default: [], immutable: true },
  metrics: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  sealedAt: { type: Date, default: Date.now, immutable: true },
}, { timestamps: true });

snapshotSchema.index({ sealedAt: -1 });
export default mongoose.model('AIEvaluationDatasetSnapshot', snapshotSchema);
