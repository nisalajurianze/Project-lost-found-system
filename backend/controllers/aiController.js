// ============================================
// AI Controller
// Handles AI endpoints for the frontend
// ============================================

import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { suggestDetailsFromImage } from '../services/imageAnalysisService.js';
import { getAiProviderStatus } from '../services/aiProviderService.js';
import { publicLocationView, resolveLocation } from '../services/locationIntelligenceService.js';
import { assessReport } from '../services/reportIntelligenceService.js';
import { runGoldenEvals } from '../evals/runGoldenEvals.js';
import { issueReportConfirmation, submitApprovedAssistantReport } from '../services/assistantReportSubmissionService.js';

export const suggestItemDetails = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image provided for AI analysis.');

  try {
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const suggestions = await suggestDetailsFromImage(base64Image);
    return ApiResponse.ok(suggestions, 'AI suggestions generated successfully').send(res);
  } catch (error) {
    console.warn('[ai] image suggestion unavailable', { code: error.code || error.name });
    throw ApiError.serviceUnavailable('AI image suggestions are temporarily unavailable. Enter the item details manually.');
  }
});

export const resolveLocationSuggestion = asyncHandler(async (req, res) => {
  const query = String(req.body?.query || '').normalize('NFKC').trim();
  if (query.length < 2 || query.length > 300) throw ApiError.badRequest('Location query must be between 2 and 300 characters.');
  const resolved = resolveLocation(query);
  const suggestions = resolved.matches.map(({ location, score }) => ({
    id: location.id,
    canonicalName: location.canonicalName,
    area: location.area,
    verificationStatus: location.verificationStatus,
    sensitivity: location.sensitivity,
    confidence: Math.round(score * 100),
  }));
  return ApiResponse.ok({
    query,
    best: publicLocationView(resolved),
    suggestions,
    needsClarification: !resolved.best || resolved.confidence < 65,
    privacyNotice: 'Private residences and restricted places are returned only as approximate zones.',
  }, 'Location interpretation completed.').send(res);
});

export const getAIProviderHealth = asyncHandler(async (_req, res) => {
  return ApiResponse.ok({
    ...getAiProviderStatus(),
    evaluations: runGoldenEvals(),
  }, 'AI provider health retrieved.').send(res);
});

export const confirmAssistantReport = asyncHandler(async (req, res) => {
  const result = await issueReportConfirmation({
    sessionId: req.body?.sessionId,
    expectedVersion: req.body?.sessionVersion,
    userId: req.user._id,
  });
  return ApiResponse.ok(result, 'Report draft approved. Confirmation is valid for ten minutes.').send(res);
});

export const submitAssistantReport = asyncHandler(async (req, res) => {
  const receipt = await submitApprovedAssistantReport({
    sessionId: req.body?.sessionId,
    expectedVersion: req.body?.sessionVersion,
    confirmationToken: req.body?.confirmationToken,
    userId: req.user._id,
  });
  return ApiResponse.created(receipt, 'Approved assistant report submitted successfully.').send(res);
});


export const assessReportDraft = asyncHandler(async (req, res) => {
  const reportType = String(req.body?.reportType || '').toLowerCase();
  if (!['lost', 'found'].includes(reportType)) throw ApiError.badRequest('Report type must be lost or found.');
  const report = {
    itemName: String(req.body?.itemName || '').slice(0, 150),
    category: String(req.body?.category || '').slice(0, 150),
    description: String(req.body?.description || '').slice(0, 2000),
    brand: String(req.body?.brand || '').slice(0, 100),
    model: String(req.body?.model || '').slice(0, 120),
    material: String(req.body?.material || '').slice(0, 100),
    colors: req.body?.colors,
    uniqueFeatures: req.body?.uniqueFeatures,
    tags: req.body?.tags,
    location: String(req.body?.location || '').slice(0, 300),
    date: req.body?.date,
    hasImage: Boolean(req.body?.hasImage),
  };
  const result = await assessReport({
    report,
    itemType: reportType === 'lost' ? 'LostItem' : 'FoundItem',
    userId: req.user._id,
    excludeItemId: req.body?.excludeItemId || null,
  });
  return ApiResponse.ok(result, 'Report quality and duplicate preflight completed.').send(res);
});
