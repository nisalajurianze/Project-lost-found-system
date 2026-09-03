import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  value: { type: mongoose.Schema.Types.Mixed, default: '' },
  confidence: { type: Number, min: 0, max: 100, default: 0 },
  sourceTurn: { type: Number, min: 0, default: 0 },
}, { _id: false });

const changeSchema = new mongoose.Schema({
  field: { type: String, required: true, maxlength: 40 },
  before: { type: mongoose.Schema.Types.Mixed, default: '' },
  after: { type: mongoose.Schema.Types.Mixed, default: '' },
  operation: { type: String, enum: ['set', 'replace', 'remove', 'undo'], required: true },
  turn: { type: Number, min: 1, required: true },
  at: { type: Date, required: true },
}, { _id: false });

const assistantSessionSchema = new mongoose.Schema({
  sessionKey: { type: String, required: true, unique: true, index: true, maxlength: 64 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  responseStyle: { type: String, enum: ['en', 'si', 'ta', 'singlish'], default: 'en' },
  reportType: { type: String, enum: ['', 'lost', 'found'], default: '' },
  slots: { type: Map, of: slotSchema, default: {} },
  missing: { type: [String], default: [] },
  nextField: { type: String, default: '', maxlength: 40 },
  state: {
    type: String,
    enum: ['discovering', 'collecting', 'reviewing', 'awaiting-auth', 'confirming', 'submitted', 'cancelled', 'expired', 'handoff'],
    default: 'discovering',
    index: true,
  },
  stateVersion: { type: Number, min: 0, default: 0 },
  turnCount: { type: Number, min: 0, default: 0 },
  changes: { type: [changeSchema], default: [] },
  submittedReport: {
    itemType: { type: String, enum: ['', 'LostItem', 'FoundItem'], default: '' },
    itemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    submittedAt: { type: Date, default: null },
  },
  lastActivityAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

assistantSessionSchema.index({ ownerId: 1, lastActivityAt: -1 });

const AssistantSession = mongoose.model('AssistantSession', assistantSessionSchema);
export default AssistantSession;
