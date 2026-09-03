import mongoose from 'mongoose';

const assistantSubmissionSchema = new mongoose.Schema({
  sessionKey: { type: String, required: true, unique: true, index: true, maxlength: 64 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportType: { type: String, enum: ['lost', 'found'], required: true },
  draftChecksum: { type: String, required: true, maxlength: 64 },
  confirmationTokenHash: { type: String, required: true, maxlength: 64 },
  confirmedStateVersion: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['pending', 'processing', 'submitted', 'failed'], default: 'pending', index: true },
  leaseUntil: { type: Date, default: null },
  reportModel: { type: String, enum: ['', 'LostItem', 'FoundItem'], default: '' },
  reportId: { type: mongoose.Schema.Types.ObjectId, default: null },
  submittedAt: { type: Date, default: null },
  lastErrorCode: { type: String, default: '', maxlength: 100 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

assistantSubmissionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('AssistantSubmission', assistantSubmissionSchema);
