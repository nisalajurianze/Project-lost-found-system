import mongoose from 'mongoose';

const assistantHandoffSchema = new mongoose.Schema({
  sessionKey: { type: String, required: true, maxlength: 64, index: true },
  assistantSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssistantSession', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, maxlength: 500, default: '' },
  redactedSummary: { type: String, required: true, maxlength: 3000 },
  responseStyle: { type: String, enum: ['en', 'si', 'ta', 'singlish'], default: 'en' },
  safetyFlags: { type: [String], default: [] },
  consent: { type: Boolean, required: true, immutable: true },
  status: { type: String, enum: ['queued', 'in-progress', 'resolved', 'closed'], default: 'queued', index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  adminNote: { type: String, maxlength: 1000, default: '' },
  resolvedAt: { type: Date, default: null },
  policy: { type: String, default: 'consented-redacted-summary-authorized-admin-only', immutable: true },
}, { timestamps: true });

assistantHandoffSchema.index({ status: 1, createdAt: 1 });
assistantHandoffSchema.index({ sessionKey: 1, status: 1 });
export default mongoose.model('AssistantHandoff', assistantHandoffSchema);
