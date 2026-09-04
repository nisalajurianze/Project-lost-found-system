import crypto from 'node:crypto';
import mongoose from 'mongoose';
import AssistantSession from '../models/AssistantSession.js';
import AssistantSubmission from '../models/AssistantSubmission.js';
import Category, { normalizeCategoryName } from '../models/Category.js';
import { generateCategoryDetails } from './imageAnalysisService.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ApiError from '../utils/apiError.js';
import { deleteCache } from '../config/redis.js';
import { enqueueItemProcessing } from './outboxService.js';
import { locationIntelligenceView, resolveLocation } from './locationIntelligenceService.js';
import { publicSessionState, sessionKeyFor } from './conversationStateService.js';

const CONFIRMATION_TTL_MS = 10 * 60 * 1000;
const PROCESSING_LEASE_MS = 2 * 60 * 1000;
const digest = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const tokenMatches = (token, expectedHash) => {
  const actual = Buffer.from(digest(token), 'hex');
  const expected = Buffer.from(String(expectedHash || ''), 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};
const list = (value, max) => [...new Set(String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean))].slice(0, max);
const tags = (value) => list(value, 20).map((entry) => entry.toLowerCase());

const resolveAssistantCategory = async (value) => {
  const requested = String(value || '').trim();
  const normalized = normalizeCategoryName(requested);
  if (!normalized) return null;
  const existing = await Category.findOne({ normalizedName: normalized, isActive: true });
  if (existing) return existing;
  try {
    const names = await Category.find({ isActive: true }).distinct('name');
    const details = await generateCategoryDetails(requested, names);
    const name = String(details.correctedName || requested).normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 100);
    const corrected = normalizeCategoryName(name);
    const mapped = await Category.findOne({ normalizedName: corrected, isActive: true });
    if (mapped) return mapped;
    return await Category.create({ name, normalizedName: corrected, icon: String(details.icon || '📦').slice(0, 10), description: String(details.description || '').slice(0, 300), isActive: true });
  } catch (error) {
    if (error?.code === 11000) return Category.findOne({ normalizedName: normalizeCategoryName(requested), isActive: true });
    return null;
  }
};

const locationIntelligence = (value) => {
  const view = locationIntelligenceView(resolveLocation(value));
  return {
    canonicalId: view?.id || '', canonicalName: view?.canonicalName || '', area: view?.area || '',
    verificationStatus: view?.verificationStatus || '', sensitivity: view?.sensitivity || '',
    confidence: view?.confidence || 0, needsReview: !view || view.confidence < 65,
  };
};

const validateOwnerAndVersion = (record, userId, expectedVersion) => {
  if (!record) throw ApiError.notFound('Assistant report draft not found or expired.');
  if (record.ownerId && String(record.ownerId) !== String(userId)) throw ApiError.forbidden('This assistant draft belongs to another account.');
  if (Number(expectedVersion) !== record.stateVersion) throw ApiError.conflict('This draft changed in another tab. Review the latest version before submitting.');
};

const issueReportConfirmation = async ({ sessionId, expectedVersion, userId, now = new Date() }) => {
  const sessionKey = sessionKeyFor(sessionId);
  const record = await AssistantSession.findOne({ sessionKey });
  validateOwnerAndVersion(record, userId, expectedVersion);
  if (record.state !== 'reviewing' || record.missing.length) throw ApiError.badRequest('Complete every required report detail before approval.');
  const state = publicSessionState(record);
  const draftChecksum = digest(JSON.stringify({ reportType: state.reportType, fields: state.fields }));
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + CONFIRMATION_TTL_MS);
  const updated = await AssistantSession.findOneAndUpdate(
    { _id: record._id, stateVersion: record.stateVersion, state: 'reviewing' },
    { $set: { ownerId: userId, state: 'confirming', lastActivityAt: now, expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }, $inc: { stateVersion: 1 } },
    { new: true },
  );
  if (!updated) throw ApiError.conflict('This draft changed in another tab. Review the latest version before submitting.');
  await AssistantSubmission.findOneAndUpdate(
    { sessionKey },
    { $set: { userId, reportType: state.reportType, draftChecksum, confirmationTokenHash: digest(token), confirmedStateVersion: updated.stateVersion, status: 'pending', leaseUntil: null, reportModel: '', reportId: null, submittedAt: null, lastErrorCode: '', expiresAt } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { confirmationToken: token, expiresAt, sessionVersion: updated.stateVersion, draftChecksum };
};

const findReceipt = async (submission) => {
  if (!submission?.reportId || !submission.reportModel) return null;
  const Model = submission.reportModel === 'FoundItem' ? FoundItem : LostItem;
  const report = await Model.findById(submission.reportId).select('_id itemName status createdAt').lean();
  return report ? {
    reportId: report._id,
    reportType: submission.reportType,
    itemName: report.itemName,
    status: report.status,
    submittedAt: submission.submittedAt || report.createdAt,
    url: submission.reportType === 'found' ? `/found-items/${report._id}` : `/lost-items/${report._id}`,
    sessionVersion: submission.confirmedStateVersion + 1,
    idempotentReplay: true,
  } : null;
};

const submitApprovedAssistantReport = async ({ sessionId, expectedVersion, confirmationToken, userId, now = new Date() }) => {
  const sessionKey = sessionKeyFor(sessionId);
  let submission = await AssistantSubmission.findOne({ sessionKey, userId });
  if (!submission) throw ApiError.notFound('Report confirmation not found or expired.');
  if (!tokenMatches(confirmationToken, submission.confirmationTokenHash)) throw ApiError.forbidden('Invalid report confirmation token.');
  if (submission.status === 'submitted') return findReceipt(submission);
  if (submission.expiresAt <= now) throw ApiError.badRequest('Report confirmation expired. Review and approve the draft again.');

  const assistantSession = await AssistantSession.findOne({ sessionKey });
  validateOwnerAndVersion(assistantSession, userId, expectedVersion);
  if (assistantSession.state !== 'confirming' || submission.confirmedStateVersion !== assistantSession.stateVersion) throw ApiError.conflict('The approved draft is no longer current.');

  submission = await AssistantSubmission.findOneAndUpdate(
    {
      _id: submission._id,
      $or: [{ status: 'pending' }, { status: 'failed' }, { status: 'processing', leaseUntil: { $lte: now } }],
    },
    { $set: { status: 'processing', leaseUntil: new Date(now.getTime() + PROCESSING_LEASE_MS), lastErrorCode: '' } },
    { new: true },
  );
  if (!submission) throw ApiError.conflict('This approved report is already being submitted. Retry shortly for the receipt.');

  const state = publicSessionState(assistantSession);
  if (digest(JSON.stringify({ reportType: state.reportType, fields: state.fields })) !== submission.draftChecksum) throw ApiError.conflict('The report changed after approval. Review it again.');
  const Model = state.reportType === 'found' ? FoundItem : LostItem;
  const existing = await Model.findOne({ assistantSubmissionId: submission._id });
  if (existing) {
    submission.status = 'submitted'; submission.reportId = existing._id; submission.reportModel = Model.modelName; submission.submittedAt ||= existing.createdAt;
    await submission.save();
    return findReceipt(submission);
  }

  const category = await resolveAssistantCategory(state.fields.category)
    || await Category.findOne({ normalizedName: normalizeCategoryName('Other'), isActive: true });
  if (!category) {
    await AssistantSubmission.updateOne({ _id: submission._id }, { $set: { status: 'failed', leaseUntil: null, lastErrorCode: 'CATEGORY_UNAVAILABLE' } });
    throw ApiError.badRequest('No active report categories are available. Please try again later.');
  }
  const description = `${state.fields.description || state.fields.itemName}. Identifying feature: ${state.fields.uniqueFeatures}`.slice(0, 2000);
  const common = {
    assistantSubmissionId: submission._id, userId, itemName: state.fields.itemName, category: category.name,
    description, brand: state.fields.brand || '', model: state.fields.model || '', colors: list(state.fields.colors, 6),
    material: state.fields.material || '', uniqueFeatures: list(state.fields.uniqueFeatures, 12),
    contactPreference: 'both', contactVisibility: 'request_only', tags: tags(state.fields.tags), images: [],
  };
  const mongoSession = await mongoose.startSession();
  let item;
  try {
    await mongoSession.withTransaction(async () => {
      [item] = state.reportType === 'found'
        ? await FoundItem.create([{ ...common, foundLocation: state.fields.location, foundDate: state.fields.date, storedAt: state.fields.storedAt, locationIntelligence: locationIntelligence(state.fields.location), status: 'available' }], { session: mongoSession })
        : await LostItem.create([{ ...common, lostLocation: state.fields.location, lostDate: state.fields.date, locationIntelligence: locationIntelligence(state.fields.location), status: 'pending' }], { session: mongoSession });
      await enqueueItemProcessing(Model.modelName, item._id, item.createdAt.getTime(), mongoSession);
      await AssistantSubmission.updateOne({ _id: submission._id }, { $set: { status: 'submitted', leaseUntil: null, reportModel: Model.modelName, reportId: item._id, submittedAt: now } }, { session: mongoSession });
      await AssistantSession.updateOne({ _id: assistantSession._id, stateVersion: assistantSession.stateVersion }, { $set: { state: 'submitted', submittedReport: { itemType: Model.modelName, itemId: item._id, submittedAt: now }, lastActivityAt: now }, $inc: { stateVersion: 1 } }, { session: mongoSession });
    });
  } catch (error) {
    await AssistantSubmission.updateOne({ _id: submission._id, status: 'processing' }, { $set: { status: 'failed', leaseUntil: null, lastErrorCode: String(error.code || error.name || 'SUBMISSION_FAILED').slice(0, 100) } });
    throw error;
  } finally {
    await mongoSession.endSession();
  }
  await deleteCache(state.reportType === 'found' ? ['foundItems:*', 'cache:/api/found-items*'] : ['lostItems:*', 'cache:/api/lost-items*']);
  return { reportId: item._id, reportType: state.reportType, itemName: item.itemName, status: item.status, submittedAt: now, url: state.reportType === 'found' ? `/found-items/${item._id}` : `/lost-items/${item._id}`, sessionVersion: Number(expectedVersion) + 1, idempotentReplay: false };
};

export { CONFIRMATION_TTL_MS, issueReportConfirmation, submitApprovedAssistantReport, tokenMatches };
