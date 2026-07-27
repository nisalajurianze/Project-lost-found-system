import mongoose from 'mongoose';

const outboxEventSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['item.process'], index: true },
  payload: {
    itemType: { type: String, enum: ['LostItem', 'FoundItem'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  dedupeKey: { type: String, required: true, unique: true, index: true, maxlength: 250 },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'dead'], default: 'pending', index: true },
  attempts: { type: Number, default: 0, min: 0 },
  availableAt: { type: Date, default: Date.now, index: true },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: String, default: '', maxlength: 200 },
  lastError: { type: String, default: '', maxlength: 2000 },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

outboxEventSchema.index({ status: 1, availableAt: 1, createdAt: 1 });
outboxEventSchema.index({ completedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: 'completed' } });

export default mongoose.model('OutboxEvent', outboxEventSchema);
