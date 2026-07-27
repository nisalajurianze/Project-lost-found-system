import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  action: { type: String, required: true, maxlength: 80 },
  status: { type: String, maxlength: 40 },
  note: { type: String, maxlength: 500 },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const locationKnowledgeSchema = new mongoose.Schema({
  canonicalName: { type: String, required: true, trim: true, maxlength: 180 },
  names: {
    en: { type: String, trim: true, maxlength: 180 },
    si: { type: String, trim: true, maxlength: 180 },
    ta: { type: String, trim: true, maxlength: 180 },
  },
  aliases: [{ type: String, trim: true, maxlength: 120 }],
  category: { type: String, trim: true, maxlength: 80, default: 'landmark' },
  campus: { type: String, trim: true, maxlength: 120 },
  area: { type: String, required: true, trim: true, maxlength: 140 },
  administrativeArea: { type: String, trim: true, maxlength: 180 },
  parentId: { type: String, trim: true, maxlength: 120 },
  coordinates: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
  },
  approximateZone: { type: String, trim: true, maxlength: 180 },
  nearbyRoads: [{ type: String, trim: true, maxlength: 140 }],
  nearbyLandmarks: [{ type: String, trim: true, maxlength: 140 }],
  verificationStatus: {
    type: String,
    enum: ['community-suggested', 'map-source-verified', 'field-verified', 'university-approved', 'temporarily-closed', 'archived'],
    default: 'community-suggested',
    index: true,
  },
  sensitivity: { type: String, enum: ['public', 'zone-only', 'restricted'], default: 'zone-only' },
  sourceType: { type: String, enum: ['community', 'university', 'field-survey', 'public-map', 'admin'], default: 'community' },
  sourceReference: { type: String, trim: true, maxlength: 500 },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  lastVerifiedAt: Date,
  isActive: { type: Boolean, default: false, index: true },
  version: { type: Number, default: 1, min: 1 },
  history: { type: [historySchema], default: [] },
}, { timestamps: true });

locationKnowledgeSchema.index({ canonicalName: 'text', area: 'text', aliases: 'text' });
locationKnowledgeSchema.index({ canonicalName: 1, area: 1 }, { unique: true });
locationKnowledgeSchema.index({ aliases: 1 });
locationKnowledgeSchema.index({ verificationStatus: 1, isActive: 1, updatedAt: -1 });

export default mongoose.model('LocationKnowledge', locationKnowledgeSchema);
