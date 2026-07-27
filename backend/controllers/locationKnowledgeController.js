import LocationKnowledge from '../models/LocationKnowledge.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { publicLocationView, resolveLocation } from '../services/locationIntelligenceService.js';
import { ACTIVE_STATUSES, refreshApprovedLocations } from '../services/locationKnowledgeBootstrapService.js';

const clean = (value, max = 180) => String(value || '').normalize('NFKC').trim().slice(0, max);
const cleanList = (value, maxItems = 30, maxLength = 140) => [...new Set((Array.isArray(value) ? value : String(value || '').split(','))
  .map((entry) => clean(entry, maxLength)).filter(Boolean).slice(0, maxItems))];

const resolveKnownLocation = asyncHandler(async (req, res) => {
  const query = clean(req.query.q, 240);
  if (!query) throw ApiError.badRequest('Provide a location description.');
  const resolved = resolveLocation(query);
  const candidates = resolved.matches.map(({ location, score }) => ({
    id: location.id,
    canonicalName: location.canonicalName,
    area: location.area,
    verificationStatus: location.verificationStatus,
    sensitivity: location.sensitivity,
    confidence: Math.round(score * 100),
  }));
  return ApiResponse.ok({ query, best: publicLocationView(resolved), candidates, needsClarification: resolved.confidence < 65 || candidates.length > 1 && candidates[0].confidence - candidates[1].confidence < 12 }).send(res);
});

const submitLocationSuggestion = asyncHandler(async (req, res) => {
  const canonicalName = clean(req.body.canonicalName);
  const area = clean(req.body.area, 140);
  if (canonicalName.length < 3 || area.length < 2) throw ApiError.badRequest('Canonical name and area are required.');
  const location = await LocationKnowledge.create({
    canonicalName,
    names: { en: clean(req.body.names?.en), si: clean(req.body.names?.si), ta: clean(req.body.names?.ta) },
    aliases: cleanList(req.body.aliases, 30, 120),
    category: clean(req.body.category, 80) || 'landmark',
    campus: clean(req.body.campus, 120),
    area,
    administrativeArea: clean(req.body.administrativeArea),
    parentId: clean(req.body.parentId, 120),
    approximateZone: clean(req.body.approximateZone),
    nearbyRoads: cleanList(req.body.nearbyRoads),
    nearbyLandmarks: cleanList(req.body.nearbyLandmarks),
    sensitivity: ['public', 'zone-only', 'restricted'].includes(req.body.sensitivity) ? req.body.sensitivity : 'zone-only',
    sourceReference: clean(req.body.sourceReference, 500),
    submittedBy: req.user._id,
    history: [{ action: 'suggested', status: 'community-suggested', note: clean(req.body.note, 500), changedBy: req.user._id }],
  });
  return ApiResponse.created({ id: location._id, status: location.verificationStatus }, 'Location suggestion submitted for human review.').send(res);
});

const listLocationKnowledge = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.verificationStatus = clean(req.query.status, 40);
  if (req.query.search) filter.$text = { $search: clean(req.query.search, 180) };
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const records = await LocationKnowledge.find(filter).populate('submittedBy reviewedBy', 'fullName email').sort({ isActive: 1, updatedAt: -1 }).limit(limit).lean();
  return ApiResponse.ok({ records }).send(res);
});

const reviewLocationKnowledge = asyncHandler(async (req, res) => {
  const record = await LocationKnowledge.findById(req.params.id);
  if (!record) throw ApiError.notFound('Location knowledge record not found.');
  const status = clean(req.body.verificationStatus, 40);
  const allowed = ['community-suggested', ...ACTIVE_STATUSES, 'temporarily-closed', 'archived'];
  if (!allowed.includes(status)) throw ApiError.badRequest('Unsupported verification status.');
  if (req.body.canonicalName !== undefined) record.canonicalName = clean(req.body.canonicalName);
  if (req.body.area !== undefined) record.area = clean(req.body.area, 140);
  if (req.body.aliases !== undefined) record.aliases = cleanList(req.body.aliases, 30, 120);
  if (req.body.sensitivity !== undefined && ['public', 'zone-only', 'restricted'].includes(req.body.sensitivity)) record.sensitivity = req.body.sensitivity;
  record.verificationStatus = status;
  record.isActive = ACTIVE_STATUSES.includes(status);
  record.reviewedBy = req.user._id;
  record.reviewedAt = new Date();
  if (record.isActive) record.lastVerifiedAt = new Date();
  record.version += 1;
  record.history.push({ action: record.isActive ? 'approved-or-updated' : 'status-updated', status, note: clean(req.body.note, 500), changedBy: req.user._id });
  await record.save();
  await refreshApprovedLocations();
  return ApiResponse.ok(record, 'Location knowledge reviewed and active resolver refreshed.').send(res);
});

export { listLocationKnowledge, resolveKnownLocation, reviewLocationKnowledge, submitLocationSuggestion };
