import mongoose from 'mongoose';

const aiDecisionFeedbackSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['Match', 'ImageAnalysis', 'LocationKnowledge', 'ReportSuggestion'],
    required: true,
    index: true,
  },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  decision: {
    type: String,
    enum: ['confirmed', 'not-same', 'useful', 'wrong-category', 'wrong-colour', 'wrong-location', 'wrong-description', 'other'],
    required: true,
    index: true,
  },
  dimension: { type: String, trim: true, maxlength: 80, default: '' },
  note: { type: String, trim: true, maxlength: 1000, default: '' },
  source: { type: String, enum: ['user-action', 'admin-review', 'system-record'], default: 'user-action' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, trim: true, maxlength: 1000, default: '' },
  algorithmVersion: { type: String, trim: true, maxlength: 50, default: '' },
  policy: { type: String, default: 'admin-approved-dataset-only', immutable: true },
}, { timestamps: true });

aiDecisionFeedbackSchema.index({ status: 1, createdAt: -1 });
aiDecisionFeedbackSchema.index({ targetType: 1, targetId: 1, submittedBy: 1, decision: 1 });

export default mongoose.model('AIDecisionFeedback', aiDecisionFeedbackSchema);
