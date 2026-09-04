import mongoose from 'mongoose';
import LostItem from '../models/LostItem.js';
import Match from '../models/Match.js';
import ClaimRequest from '../models/ClaimRequest.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import PosterAsset from '../models/PosterAsset.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate, buildSort } from '../utils/pagination.js';
import { deleteCache } from '../config/redis.js';
import { uploadMultipleReportImages, deleteMultipleImages } from '../services/cloudinaryService.js';
import { enqueueItemProcessing } from '../services/outboxService.js';
import { resolveItemHandover, cancelItemHandover } from '../services/itemWorkflowService.js';
import { itemView } from '../utils/serializers.js';
import { locationIntelligenceView, resolveLocation } from '../services/locationIntelligenceService.js';
import { resolveOrCreateUserCategory } from '../services/categoryResolutionService.js';

const cacheKeys = ['lostItems:*', 'cache:/api/lost-items*'];
const parseTags = (value) => [...new Set((Array.isArray(value) ? value : String(value || '').split(','))
  .map((entry) => String(entry).normalize('NFKC').trim().toLowerCase()).filter(Boolean).slice(0, 20))];
const parseList = (value, max = 12) => [...new Set((Array.isArray(value) ? value : String(value || '').split(','))
  .map((entry) => String(entry).normalize('NFKC').trim()).filter(Boolean).slice(0, max))];
const buildLocationIntelligence = (value) => {
  const resolved = resolveLocation(value);
  const view = locationIntelligenceView(resolved);
  return {
    canonicalId: view?.id || '',
    canonicalName: view?.canonicalName || '',
    area: view?.area || '',
    verificationStatus: view?.verificationStatus || '',
    sensitivity: view?.sensitivity || '',
    confidence: view?.confidence || 0,
    needsReview: !view || view.confidence < 65,
  };
};
const activeCategory = (name) => resolveOrCreateUserCategory(name);

const createLostItem = asyncHandler(async (req, res) => {
  const category = await activeCategory(req.body.category);
  if (!category) throw ApiError.badRequest('Enter a valid category name.');
  const images = await uploadMultipleReportImages(req.files || [], 'lost-items');
  const session = await mongoose.startSession();
  let item;
  try {
    await session.withTransaction(async () => {
      [item] = await LostItem.create([{
        userId: req.user._id,
        itemName: req.body.itemName,
        category: category.name,
        description: req.body.description,
        lostLocation: req.body.lostLocation,
        locationIntelligence: buildLocationIntelligence(req.body.lostLocation),
        brand: req.body.brand || '',
        model: req.body.model || '',
        colors: parseList(req.body.colors, 6),
        material: req.body.material || '',
        uniqueFeatures: parseList(req.body.uniqueFeatures, 12),
        lostDate: req.body.lostDate,
        contactPreference: req.body.contactPreference || 'both',
        contactVisibility: 'request_only',
        tags: parseTags(req.body.tags),
        images,
        status: 'pending',
      }], { session });
      await enqueueItemProcessing('LostItem', item._id, item.createdAt.getTime(), session);
    });
  } catch (error) {
    await deleteMultipleImages(images);
    throw error;
  } finally { await session.endSession(); }
  await deleteCache(cacheKeys);
  return ApiResponse.created(itemView(item, req.user), 'Lost item reported successfully. Processing was queued reliably.').send(res);
});

const getLostItems = asyncHandler(async (req, res) => {
  const filter = { isDeleted: { $ne: true }, isArchived: { $ne: true } };
  if (req.query.search) filter.$text = { $search: String(req.query.search).slice(0, 200) };
  if (req.query.category) filter.category = String(req.query.category).slice(0, 100);
  const privileged = req.user && (req.user.role === 'admin' || String(req.query.userId) === String(req.user._id));
  if (privileged && req.query.status === 'all') delete filter.status;
  else if (privileged && ['pending', 'matched', 'in_progress', 'claimed', 'closed'].includes(req.query.status)) filter.status = req.query.status;
  else filter.status = { $in: ['pending', 'matched', 'in_progress'] };
  if (req.query.startDate || req.query.endDate) {
    filter.lostDate = {};
    if (req.query.startDate) filter.lostDate.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.lostDate.$lte = new Date(req.query.endDate);
  }
  if (req.query.userId) {
    if (!req.user || (req.user.role !== 'admin' && String(req.user._id) !== String(req.query.userId))) throw ApiError.forbidden('You may only filter reports by your own account.');
    filter.userId = req.query.userId;
    delete filter.isArchived;
  }
  const totalDocs = await LostItem.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);
  const sort = buildSort(req.query.sort, { lostDate: 1, createdAt: 1, itemName: 1 }, { createdAt: -1 });
  const items = await LostItem.find(filter).populate('userId', 'fullName email phone profileImage').sort(sort).skip(pagination.skip).limit(pagination.limit).lean();
  return ApiResponse.ok({ items: items.map((entry) => itemView(entry, req.user)), pagination }, 'Lost items retrieved successfully.').send(res);
});

const getLostItemById = asyncHandler(async (req, res) => {
  const item = await LostItem.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).populate('userId', 'fullName email phone profileImage').lean();
  if (!item) throw ApiError.notFound('Lost item not found.');
  const canViewArchived = req.user && (req.user.role === 'admin' || String(item.userId?._id) === String(req.user._id));
  if (item.isArchived && !canViewArchived) throw ApiError.notFound('Lost item not found.');
  return ApiResponse.ok(itemView(item, req.user), 'Lost item retrieved successfully.').send(res);
});

const updateLostItem = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id);
  if (!item || item.isDeleted) throw ApiError.notFound('Lost item not found.');
  if (String(item.userId) !== String(req.user._id) && req.user.role !== 'admin') throw ApiError.forbidden('You are not authorised to edit this item.');
  if (!['pending', 'matched'].includes(item.status)) throw ApiError.conflict('A report cannot be edited during or after a handover.');

  let category;
  if (req.body.category !== undefined) {
    category = await activeCategory(req.body.category);
    if (!category) throw ApiError.badRequest('Enter a valid category name.');
  }
  const requestedDeletes = new Set((Array.isArray(req.body.deletedImages) ? req.body.deletedImages : req.body.deletedImages ? [req.body.deletedImages] : []).map(String));
  const imagesToDelete = item.images.filter((image) => requestedDeletes.has(image.url));
  const imagesLeft = item.images.filter((image) => !requestedDeletes.has(image.url));
  if (imagesLeft.length + (req.files?.length || 0) > 5) throw ApiError.badRequest('Maximum 5 images allowed.');
  const newImages = await uploadMultipleReportImages(req.files || [], 'lost-items');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await LostItem.findById(item._id).session(session);
      if (!current || current.isDeleted || !['pending', 'matched'].includes(current.status)) throw ApiError.conflict('The report changed while it was being edited.');
      if (req.body.itemName !== undefined) current.itemName = req.body.itemName;
      if (category) current.category = category.name;
      if (req.body.description !== undefined) current.description = req.body.description;
      if (req.body.lostLocation !== undefined) current.lostLocation = req.body.lostLocation;
      if (req.body.lostLocation !== undefined) current.locationIntelligence = buildLocationIntelligence(req.body.lostLocation);
      if (req.body.brand !== undefined) current.brand = req.body.brand;
      if (req.body.model !== undefined) current.model = req.body.model;
      if (req.body.colors !== undefined) current.colors = parseList(req.body.colors, 6);
      if (req.body.material !== undefined) current.material = req.body.material;
      if (req.body.uniqueFeatures !== undefined) current.uniqueFeatures = parseList(req.body.uniqueFeatures, 12);
      if (req.body.lostDate !== undefined) current.lostDate = new Date(req.body.lostDate);
      if (req.body.contactPreference !== undefined) current.contactPreference = req.body.contactPreference;
      current.contactVisibility = 'request_only';
      if (req.body.tags !== undefined) current.tags = parseTags(req.body.tags);
      current.images = [...imagesLeft, ...newImages];
      await current.save({ session });
      await enqueueItemProcessing('LostItem', current._id, Date.now(), session);
      item.set(current.toObject());
    });
  } catch (error) {
    await deleteMultipleImages(newImages);
    throw error;
  } finally { await session.endSession(); }
  await deleteMultipleImages(imagesToDelete);
  await deleteCache(cacheKeys);
  return ApiResponse.ok(itemView(item, req.user), 'Lost item updated successfully. Processing was queued reliably.').send(res);
});

const deleteLostItem = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id);
  if (!item || item.isDeleted) throw ApiError.notFound('Lost item not found.');
  if (String(item.userId) !== String(req.user._id) && req.user.role !== 'admin') throw ApiError.forbidden('You are not authorised to delete this item.');
  if (item.status === 'in_progress') throw ApiError.conflict('Cancel the active handover before deleting this report.');
  const images = [...item.images];
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await LostItem.updateOne({ _id: item._id, isDeleted: { $ne: true } }, { $set: { isDeleted: true, isArchived: true, status: 'closed', images: [] } }, { session });
      await Match.updateMany({ lostItemId: item._id, status: { $ne: 'rejected' } }, { $set: { status: 'rejected' } }, { session });
      await ClaimRequest.updateMany({ lostItemId: item._id, status: 'pending' }, { $set: { status: 'rejected', adminRemark: 'The report was deleted.', reviewedAt: new Date(), reviewedBy: req.user._id } }, { session });
      await ImageAnalysis.deleteMany({ itemId: item._id, itemType: 'LostItem' }).session(session);
      await PosterAsset.updateMany({ reportId: item._id, reportType: 'LostItem' }, { $set: { status: 'deleted' } }, { session });
    });
  } finally { await session.endSession(); }
  await deleteMultipleImages(images);
  await deleteCache(cacheKeys);
  return ApiResponse.ok(null, 'Lost item deleted successfully.').send(res);
});

const resolveLostItem = asyncHandler(async (req, res) => {
  const item = await resolveItemHandover('LostItem', req.params.id, req.user);
  await deleteCache(cacheKeys);
  return ApiResponse.ok(item, 'Item handover resolved successfully.').send(res);
});

const cancelConnectionLostItem = asyncHandler(async (req, res) => {
  const item = await cancelItemHandover('LostItem', req.params.id, req.user, req.body?.reason);
  await deleteCache([...cacheKeys, 'foundItems:*', 'cache:/api/found-items*']);
  return ApiResponse.ok(item, 'Handover cancelled and reports reopened.').send(res);
});

export { createLostItem, getLostItems, getLostItemById, updateLostItem, deleteLostItem, resolveLostItem, cancelConnectionLostItem };
