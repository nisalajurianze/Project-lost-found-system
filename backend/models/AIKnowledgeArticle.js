import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 220 },
  answer: { type: String, trim: true, maxlength: 3000 },
}, { _id: false });

const aiKnowledgeArticleSchema = new mongoose.Schema({
  type: { type: String, enum: ['campus', 'faq'], required: true, index: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
  title: { type: String, required: true, trim: true, maxlength: 220 },
  answer: { type: String, required: true, trim: true, maxlength: 3000 },
  translations: { en: translationSchema, si: translationSchema, ta: translationSchema, singlish: translationSchema },
  aliases: [{ type: String, trim: true, maxlength: 160 }],
  sourceUrl: { type: String, required: true, trim: true, maxlength: 700 },
  sourceLabel: { type: String, required: true, trim: true, maxlength: 220 },
  visibility: { type: String, enum: ['public', 'authenticated', 'admin'], default: 'public', index: true },
  status: { type: String, enum: ['draft', 'approved', 'archived'], default: 'draft', index: true },
  version: { type: Number, min: 1, default: 1 },
  checksum: { type: String, required: true, maxlength: 64 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  reviewBy: { type: Date, required: true },
}, { timestamps: true });

aiKnowledgeArticleSchema.index({ type: 1, status: 1, visibility: 1, reviewBy: 1 });
aiKnowledgeArticleSchema.index({ title: 'text', answer: 'text', aliases: 'text' });

export default mongoose.model('AIKnowledgeArticle', aiKnowledgeArticleSchema);
