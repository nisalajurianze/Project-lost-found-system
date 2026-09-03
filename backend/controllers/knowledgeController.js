import AIKnowledgeArticle from '../models/AIKnowledgeArticle.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { answerKnowledgeQuery, checksumKnowledgeArticle } from '../services/knowledgeAssistantService.js';

const clean = (value, max) => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanList = (value) => [...new Set((Array.isArray(value) ? value : []).map((entry) => clean(entry, 160)).filter(Boolean))].slice(0, 30);
const safeSource = (value) => {
  const source = clean(value, 700);
  if (source.startsWith('/')) return source;
  try {
    const url = new URL(source);
    if (url.protocol === 'https:') return url.toString();
  } catch { /* handled below */ }
  throw ApiError.badRequest('Knowledge source must be an internal path or HTTPS URL.');
};

const answerKnowledge = asyncHandler(async (req, res) => {
  const query = clean(req.query.q, 500);
  if (query.length < 3) throw ApiError.badRequest('Provide a knowledge question of at least three characters.');
  const responseStyle = ['en', 'si', 'ta', 'singlish'].includes(req.query.style) ? req.query.style : 'en';
  const answer = await answerKnowledgeQuery({ query, responseStyle, authenticated: Boolean(req.user?._id), isAdmin: req.user?.role === 'admin' });
  return ApiResponse.ok(answer, answer.answered ? 'Approved knowledge answer retrieved.' : 'No approved source could answer this question.').send(res);
});

const listKnowledge = asyncHandler(async (req, res) => {
  const filter = {};
  if (['campus', 'faq'].includes(req.query.type)) filter.type = req.query.type;
  if (['draft', 'approved', 'archived'].includes(req.query.status)) filter.status = req.query.status;
  const records = await AIKnowledgeArticle.find(filter).populate('createdBy approvedBy', 'fullName email').sort({ updatedAt: -1 }).limit(100).lean();
  return ApiResponse.ok({ records }).send(res);
});

const createKnowledge = asyncHandler(async (req, res) => {
  const data = {
    type: ['campus', 'faq'].includes(req.body.type) ? req.body.type : 'faq',
    slug: clean(req.body.slug, 120).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''),
    title: clean(req.body.title, 220), answer: clean(req.body.answer, 3000), aliases: cleanList(req.body.aliases),
    sourceUrl: safeSource(req.body.sourceUrl), sourceLabel: clean(req.body.sourceLabel, 220),
    visibility: ['public', 'authenticated', 'admin'].includes(req.body.visibility) ? req.body.visibility : 'public',
    translations: req.body.translations || {}, reviewBy: new Date(req.body.reviewBy || Date.now() + 180 * 24 * 60 * 60 * 1000),
  };
  if (!data.slug || data.title.length < 3 || data.answer.length < 10 || !data.sourceLabel) throw ApiError.badRequest('Slug, title, answer and source label are required.');
  const record = await AIKnowledgeArticle.create({ ...data, checksum: checksumKnowledgeArticle(data), status: 'draft', createdBy: req.user._id });
  return ApiResponse.created(record, 'Knowledge article created as a draft for approval.').send(res);
});

const reviewKnowledge = asyncHandler(async (req, res) => {
  const record = await AIKnowledgeArticle.findById(req.params.id);
  if (!record) throw ApiError.notFound('Knowledge article not found.');
  const status = ['approved', 'archived'].includes(req.body.status) ? req.body.status : '';
  if (!status) throw ApiError.badRequest('Review status must be approved or archived.');
  record.status = status;
  record.version += 1;
  record.approvedBy = req.user._id;
  record.approvedAt = status === 'approved' ? new Date() : record.approvedAt;
  if (req.body.reviewBy) record.reviewBy = new Date(req.body.reviewBy);
  record.checksum = checksumKnowledgeArticle({ title: record.title, answer: record.answer, translations: record.translations, aliases: record.aliases, sourceUrl: record.sourceUrl, version: record.version });
  await record.save();
  return ApiResponse.ok(record, `Knowledge article ${status}.`).send(res);
});

export { answerKnowledge, createKnowledge, listKnowledge, reviewKnowledge };
