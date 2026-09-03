import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import PosterAsset from '../models/PosterAsset.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createPosterPreview } from '../services/posterService.js';

const modelFor = (type) => type === 'found' ? { Model: FoundItem, reportType: 'FoundItem' } : type === 'lost' ? { Model: LostItem, reportType: 'LostItem' } : null;

const previewPoster = asyncHandler(async (req, res) => {
  const resolved = modelFor(req.params.type);
  if (!resolved) throw ApiError.badRequest('Poster type must be lost or found.');
  const item = await resolved.Model.findById(req.params.id);
  if (!item) throw ApiError.notFound('Report not found.');
  if (String(item.userId) !== String(req.user._id) && req.user.role !== 'admin') throw ApiError.forbidden('Only the report owner or an admin can create its poster.');
  const language = ['en', 'si', 'ta', 'singlish'].includes(req.body?.language) ? req.body.language : 'en';
  const preview = await createPosterPreview({ item, reportType: resolved.reportType, ownerId: item.userId, language });
  return ApiResponse.created(preview, 'Privacy-safe poster preview created. Review it before sharing.').send(res);
});

const approvePoster = asyncHandler(async (req, res) => {
  const asset = await PosterAsset.findById(req.params.id);
  if (!asset) throw ApiError.notFound('Poster preview not found.');
  if (String(asset.ownerId) !== String(req.user._id) && req.user.role !== 'admin') throw ApiError.forbidden('Only the report owner or an admin can approve this poster.');
  if (asset.expiresAt <= new Date()) throw ApiError.badRequest('Poster preview expired. Create a new preview.');
  asset.status = 'approved'; asset.approvedAt = new Date(); await asset.save();
  return ApiResponse.ok({ assetId: asset._id, status: asset.status, deepLink: asset.deepLink, expiresAt: asset.expiresAt }, 'Poster approved for sharing.').send(res);
});

export { approvePoster, previewPoster };
