import mongoose from 'mongoose';
import Category, { normalizeCategoryName } from '../models/Category.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';
import { generateCategoryDetails } from '../services/imageAnalysisService.js';

const CACHE_KEY_CATEGORIES = 'categories:all';
const CACHE_TTL_SECONDS = 900;
const cleanName = (value) => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
const normalizeCategoryIcon = (value) => {
  const candidate = String(value || '').normalize('NFKC').trim();
  const emoji = candidate.match(/\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\u200D\p{Extended_Pictographic}(?:[\uFE0E\uFE0F])?)*/u);
  return emoji ? emoji[0].slice(0, 10) : '📦';
};

const categoryCounts = async () => {
  const [lost, found] = await Promise.all([
    LostItem.aggregate([{ $match: { isDeleted: { $ne: true } } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    FoundItem.aggregate([{ $match: { isDeleted: { $ne: true } } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
  ]);
  const counts = new Map();
  for (const entry of [...lost, ...found]) counts.set(normalizeCategoryName(entry._id), (counts.get(normalizeCategoryName(entry._id)) || 0) + entry.count);
  return counts;
};

const getCategories = asyncHandler(async (_req, res) => {
  const cached = await getCache(CACHE_KEY_CATEGORIES);
  if (cached) {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return ApiResponse.ok(cached, 'Categories retrieved successfully.').send(res);
  }
  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true }).select('+normalizedName').sort({ name: 1 }).lean(),
    categoryCounts(),
  ]);
  const output = categories.map(({ normalizedName, ...category }) => ({ ...category, itemCount: counts.get(normalizedName) || 0 }));
  await setCache(CACHE_KEY_CATEGORIES, output, CACHE_TTL_SECONDS);
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  return ApiResponse.ok(output, 'Categories retrieved successfully.').send(res);
});

const createCategory = asyncHandler(async (req, res) => {
  const name = cleanName(req.body.name);
  if (!name) throw ApiError.badRequest('Category name is required.');
  const normalizedName = normalizeCategoryName(name);
  if (await Category.exists({ normalizedName })) throw ApiError.conflict(`Category '${name}' already exists.`);
  try {
    const category = await Category.create({
      name,
      normalizedName,
      icon: normalizeCategoryIcon(req.body.icon),
      description: req.body.description || '',
      isActive: true,
      itemCount: 0,
    });
    await deleteCache(CACHE_KEY_CATEGORIES);
    return ApiResponse.created(category, 'Category created successfully.').send(res);
  } catch (error) {
    if (error?.code === 11000) throw ApiError.conflict(`Category '${name}' already exists.`);
    throw error;
  }
});

const updateCategory = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const category = await Category.findById(req.params.id).select('+normalizedName').session(session);
      if (!category) throw ApiError.notFound('Category not found.');
      const oldName = category.name;

      if (req.body.name !== undefined) {
        const name = cleanName(req.body.name);
        if (!name) throw ApiError.badRequest('Category name is required.');
        const normalizedName = normalizeCategoryName(name);
        const duplicate = await Category.exists({ normalizedName, _id: { $ne: category._id } }).session(session);
        if (duplicate) throw ApiError.conflict(`Category '${name}' already exists.`);
        category.name = name;
        category.normalizedName = normalizedName;
      }
      if (req.body.icon !== undefined) category.icon = req.body.icon || '📦';
      if (req.body.description !== undefined) category.description = req.body.description;
      if (req.body.isActive !== undefined) {
        if (typeof req.body.isActive !== 'boolean') throw ApiError.badRequest('isActive must be a boolean.');
        category.isActive = req.body.isActive;
      }
      await category.save({ session });

      if (oldName !== category.name) {
        await Promise.all([
          LostItem.updateMany({ category: oldName }, { $set: { category: category.name } }, { session }),
          FoundItem.updateMany({ category: oldName }, { $set: { category: category.name } }, { session }),
        ]);
      }
      result = category.toObject();
      delete result.normalizedName;
    });
  } finally { await session.endSession(); }
  await deleteCache(CACHE_KEY_CATEGORIES);
  return ApiResponse.ok(result, 'Category updated successfully.').send(res);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found.');
  const [lostCount, foundCount] = await Promise.all([
    LostItem.countDocuments({ category: category.name, isDeleted: { $ne: true } }),
    FoundItem.countDocuments({ category: category.name, isDeleted: { $ne: true } }),
  ]);
  const itemCount = lostCount + foundCount;
  if (itemCount > 0) {
    category.isActive = false;
    category.itemCount = itemCount;
    await category.save();
    await deleteCache(CACHE_KEY_CATEGORIES);
    return ApiResponse.ok(category, 'Category has reports and was deactivated instead of deleted.').send(res);
  }
  await category.deleteOne();
  await deleteCache(CACHE_KEY_CATEGORIES);
  return ApiResponse.ok(null, 'Category deleted successfully.').send(res);
});

const autoCreateCategory = asyncHandler(async (req, res) => {
  const requestedName = cleanName(req.body.name);
  if (!requestedName) throw ApiError.badRequest('Category name is required.');
  const existing = await Category.findOne({ normalizedName: normalizeCategoryName(requestedName) });
  if (existing) return ApiResponse.ok(existing, 'Category mapped to existing.').send(res);

  const existingNames = await Category.find({ isActive: true }).distinct('name');
  const details = await generateCategoryDetails(requestedName, existingNames);
  const correctedName = cleanName(details.correctedName || requestedName);
  const normalizedName = normalizeCategoryName(correctedName);
  const mapped = await Category.findOne({ normalizedName });
  if (mapped) return ApiResponse.ok(mapped, 'Category mapped to existing.').send(res);

  try {
    const category = await Category.create({
      name: correctedName,
      normalizedName,
      icon: normalizeCategoryIcon(details.icon),
      description: details.description || '',
      isActive: true,
    });
    await deleteCache(CACHE_KEY_CATEGORIES);
    return ApiResponse.created(category, 'Category created successfully.').send(res);
  } catch (error) {
    if (error?.code === 11000) {
      const category = await Category.findOne({ normalizedName });
      return ApiResponse.ok(category, 'Category mapped to existing.').send(res);
    }
    throw error;
  }
});

export { getCategories, createCategory, updateCategory, deleteCategory, autoCreateCategory };
