import mongoose from 'mongoose';

const metricSchema = new mongoose.Schema({
  sampleSize: { type: Number, min: 0, default: 0 },
  accuracy: { type: Number, min: 0, max: 100, default: 0 },
  precision: { type: Number, min: 0, max: 100, default: 0 },
  recall: { type: Number, min: 0, max: 100, default: 0 },
  falsePositiveRate: { type: Number, min: 0, max: 100, default: 0 },
}, { _id: false });

const experimentSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120 },
  algorithmVersion: { type: String, required: true, maxlength: 50 },
  datasetSnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIEvaluationDatasetSnapshot', required: true },
  threshold: { type: Number, min: 1, max: 99, default: 70 },
  metrics: { type: metricSchema, required: true },
  status: { type: String, enum: ['draft', 'challenger', 'champion', 'retired'], default: 'challenger', index: true },
  policy: { type: String, default: 'offline-evaluation-human-promotion-no-online-learning', immutable: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  promotedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  promotedAt: { type: Date, default: null },
}, { timestamps: true });

experimentSchema.index({ algorithmVersion: 1, datasetSnapshotId: 1 }, { unique: true });
export default mongoose.model('AIExperiment', experimentSchema);
