import mongoose from 'mongoose';

const outboxEventSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['item.process', 'media.delete'], index: true },
  payload: {
    itemType: { type: String, enum: ['LostItem', 'FoundItem'], default: undefined },
    itemId: { type: mongoose.Schema.Types.ObjectId, default: undefined },
    assets: {
      type: [{
        publicId: { type: String, required: true, maxlength: 300 },
        format: { type: String, default: '', maxlength: 30 },
        deliveryType: { type: String, enum: ['upload', 'authenticated'], default: 'upload' },
        originalAsset: {
          publicId: { type: String, default: '', maxlength: 300 },
          format: { type: String, default: '', maxlength: 30 },
          deliveryType: { type: String, enum: ['authenticated'], default: 'authenticated' },
        },
      }],
      default: undefined,
      validate: { validator: (assets) => !assets || assets.length <= 50, message: 'Maximum 50 media assets per event' },
    },
  },
  dedupeKey: { type: String, required: true, unique: true, index: true, maxlength: 250 },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'dead'], default: 'pending', index: true },
  attempts: { type: Number, default: 0, min: 0 },
  availableAt: { type: Date, default: Date.now, index: true },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: String, default: '', maxlength: 200 },
  lastError: { type: String, default: '', maxlength: 2000 },
  completedAt: { type: Date, default: null },
  deadAt: { type: Date, default: null },
}, { timestamps: true });

outboxEventSchema.index({ status: 1, availableAt: 1, createdAt: 1 });
outboxEventSchema.index({ completedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: 'completed' } });
outboxEventSchema.index({ deadAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { status: 'dead' } });

export default mongoose.model('OutboxEvent', outboxEventSchema);
