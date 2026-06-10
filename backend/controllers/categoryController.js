// ============================================
// Category Controller
// Handles item categories with Redis caching
// ============================================

import Category from '../models/Category.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';

const CACHE_KEY_CATEGORIES = 'categories:all';
const CACHE_TTL_SECONDS = 3600; // Cache for 1 hour

/**
 * Get all active categories. Uses Redis caching.
 */
const getCategories = asyncHandler(async (req, res) => {
  // 1. Try to fetch from Redis cache
  const cachedData = await getCache(CACHE_KEY_CATEGORIES);
  if (cachedData) {
    console.log('⚡ Redis Cache Hit: getCategories');
    return ApiResponse.ok(cachedData, 'Categories retrieved from cache.').send(res);
  }

  console.log('🐌 Redis Cache Miss: getCategories. Querying MongoDB...');
  
  // 2. Query MongoDB
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });

  // 3. Save to Redis cache
  await setCache(CACHE_KEY_CATEGORIES, categories, CACHE_TTL_SECONDS);

  ApiResponse.ok(categories, 'Categories retrieved from database.').send(res);
});

/**
 * Create a new category (Admin only).
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon, description } = req.body;

  const existing = await Category.findOne({ name });
  if (existing) {
    throw ApiError.conflict(`Category '${name}' already exists.`);
  }

  const category = await Category.create({
    name,
    icon: icon || '📦',
    description: description || '',
    isActive: true,
    itemCount: 0
  });

  // Invalidate Redis cache
  await deleteCache(CACHE_KEY_CATEGORIES);

  ApiResponse.created(category, 'Category created successfully.').send(res);
});

/**
 * Update an existing category (Admin only).
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { name, icon, description, isActive } = req.body;
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw ApiError.notFound('Category not found.');
  }

  // If changing name, verify unique
  if (name && name !== category.name) {
    const existing = await Category.findOne({ name });
    if (existing) {
      throw ApiError.conflict(`Category '${name}' already exists.`);
    }
    category.name = name;
  }

  if (icon) category.icon = icon;
  if (description !== undefined) category.description = description;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();

  // Invalidate Redis cache
  await deleteCache(CACHE_KEY_CATEGORIES);

  ApiResponse.ok(category, 'Category updated successfully.').send(res);
});

/**
 * Delete a category (Admin only).
 * Disallows deletion if there are items associated, deactivates instead.
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw ApiError.notFound('Category not found.');
  }

  // If category contains items, deactivate it instead of deleting
  if (category.itemCount > 0) {
    category.isActive = false;
    await category.save();
    await deleteCache(CACHE_KEY_CATEGORIES);
    return ApiResponse.ok(category, 'Category contains items. Deactivated instead of deleted.').send(res);
  }

  await Category.findByIdAndDelete(req.params.id);

  // Invalidate Redis cache
  await deleteCache(CACHE_KEY_CATEGORIES);

  ApiResponse.noContent('Category deleted successfully.').send(res);
});

export {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
