import mongoose from 'mongoose';

const refreshSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  familyId: { type: String, required: true, maxlength: 128, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  familyExpiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  compromisedAt: { type: Date, default: null },
  replacedByHash: { type: String, default: null, select: false },
  userAgent: { type: String, maxlength: 500, default: '' },
  ipAddress: { type: String, maxlength: 100, default: '' },
}, { timestamps: true });

refreshSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
refreshSessionSchema.index({ familyId: 1, revokedAt: 1, familyExpiresAt: 1 });

export default mongoose.model('RefreshSession', refreshSessionSchema);
