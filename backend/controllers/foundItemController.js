// ============================================
// Found Item Controller
// Handles creation, listing, updating, and deleting of Found Items
// ============================================

import FoundItem from '../models/FoundItem.js';
import Category from '../models/Category.js';
import Match from '../models/Match.js';
import ClaimRequest from '../models/ClaimRequest.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate, buildSort } from '../utils/pagination.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';
import { uploadMultipleImages, deleteMultipleImages } from '../services/cloudinaryService.js';
import { analyzeItemImage, generateCategoryDetails, generateKeywordsFromText } from '../services/imageAnalysisService.js';
import { runMatchingForItem } from '../services/aiMatchingService.js';

/**
 * Report a found item.
 * Uploads images, runs image analysis in background, and triggers matching.
 */
const createFoundItem = asyncHandler(async (req, res) => {
  const { itemName, category, description, foundLocation, foundDate, storedAt, tags, contactPreference } = req.body;
  const userId = req.user._id;

  // Verify category exists or auto-create it (case-insensitive check first)
  let categoryExists = await Category.findOne({ name: { $regex: new RegExp(`^${category}$`, 'i') }, isActive: true });
  if (!categoryExists) {
    // Attempt auto-creation with AI using existing categories context
    try {
      const existingCats = await Category.find({ isActive: true }).select('name').lean();
      const existingNames = existingCats.map(c => c.name);

      const details = await generateCategoryDetails(category, existingNames);
      const correctedName = details.correctedName || category;

      // Check again with the corrected name
      categoryExists = await Category.findOne({ name: { $regex: new RegExp(`^${correctedName}$`, 'i') }, isActive: true });
      
      if (!categoryExists) {
        categoryExists = await Category.create({
          name: correctedName,
          icon: details.icon,
          description: details.description,
          isActive: true,
          itemCount: 0
        });
        
        // Clear redis cache for categories since we created a new one
        const { deleteCache } = await import('../config/redis.js');
        await deleteCache('categories:all');
      }
    } catch (e) {
      throw ApiError.badRequest(`Failed to create new category '${category}'.`);
    }
  }

  // Use the exact database name so that items are grouped properly
  const finalCategoryName = categoryExists.name;

  // Parse tags
  let parsedTags = [];
  if (tags) {
    parsedTags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
  }

  // Upload images
  let images = [];
  if (req.files && req.files.length > 0) {
    images = await uploadMultipleImages(req.files, 'found-items');
  }

  // Create found item
  const foundItem = await FoundItem.create({
    userId,
    itemName,
    category: finalCategoryName,
    description,
    foundLocation,
    foundDate,
    storedAt: storedAt || '',
    contactPreference: contactPreference || 'both',
    tags: parsedTags,
    images,
    status: 'available'
  });

  // Increment item count in category
  categoryExists.itemCount = (categoryExists.itemCount || 0) + 1;
  await categoryExists.save();

  // Invalidate cache
  await deleteCache(['foundItems:*', 'cache:/api/found-items*']);

  // Run AI analysis and AI Matching in background
  // Background processing
  (async () => {
    try {
      let analysisResult = null;
      if (images.length > 0) {
        analysisResult = await analyzeItemImage('FoundItem', foundItem._id, images[0].url, itemName, description);
      } else {
        analysisResult = await analyzeItemImage('FoundItem', foundItem._id, '', itemName, description);
      }

      // Generate Keywords from Text (Translates Singlish/Sinhala -> English)
      const textKeywords = await generateKeywordsFromText(itemName, description);
      
      // Combine text keywords with image labels and colors
      let finalKeywords = [...textKeywords];
      if (analysisResult) {
        const imgLabels = analysisResult.labels ? analysisResult.labels.map(l => l.toLowerCase()) : [];
        const imgColors = analysisResult.colors ? analysisResult.colors.map(c => c.toLowerCase()) : [];
        finalKeywords = [...new Set([...finalKeywords, ...imgLabels, ...imgColors])];
      }

      if (finalKeywords.length > 0) {
        foundItem.aiKeywords = finalKeywords;
        await foundItem.save();
      }

      await runMatchingForItem(foundItem, 'FoundItem');
    } catch (err) {
      console.error(`❌ Background processing failed for FoundItem ${foundItem._id}:`, err);
    }
  })();

  ApiResponse.created(foundItem, 'Found item reported successfully. AI matching triggered.').send(res);
});

/**
 * Get all found items (with pagination, search, and filters).
 */
const getFoundItems = asyncHandler(async (req, res) => {
  const cacheKey = `foundItems:${JSON.stringify(req.query)}`;
  
  // Try Cache
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    return ApiResponse.ok(cachedData, 'Found items retrieved from cache.').send(res);
  }

  const filter = { isDeleted: { $ne: true } };

  // 1. Text Search
  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }

  // 2. Category Filter
  if (req.query.category) {
    filter.category = req.query.category;
  }

  // 3. Status Filter (default to available/matched for public display)
  if (req.query.status) {
    if (req.query.status !== 'all') {
      filter.status = req.query.status;
    }
  } else {
    filter.status = { $in: ['available', 'matched'] };
  }

  // 4. Date Range Filter
  if (req.query.startDate || req.query.endDate) {
    filter.foundDate = {};
    if (req.query.startDate) {
      filter.foundDate.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.foundDate.$lte = new Date(req.query.endDate);
    }
  }

  // 5. User Specific Filter (for "My Found Listings")
  if (req.query.userId) {
    filter.userId = req.query.userId;
  }

  // Get total count
  const totalDocs = await FoundItem.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);

  // Sorting
  const allowedSort = { foundDate: 1, createdAt: 1, itemName: 1 };
  const sort = buildSort(req.query.sort, allowedSort, { createdAt: -1 });

  // Execute query
  const items = await FoundItem.find(filter)
    .populate('userId', 'fullName profileImage')
    .sort(sort)
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();

  const responsePayload = { items, pagination };
  
  // Save to cache (5 minutes)
  await setCache(cacheKey, responsePayload, 300);

  ApiResponse.ok(responsePayload, 'Found items retrieved successfully.').send(res);
});

/**
 * Get found item by ID.
 */
const getFoundItemById = asyncHandler(async (req, res) => {
  const item = await FoundItem.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
    .populate('userId', 'fullName email phone profileImage studentId')
    .lean();

  if (!item) {
    throw ApiError.notFound('Found item not found.');
  }

  ApiResponse.ok(item, 'Found item retrieved successfully.').send(res);
});

/**
 * Update found item.
 */
const updateFoundItem = asyncHandler(async (req, res) => {
  const { itemName, category, description, foundLocation, foundDate, storedAt, status, tags, contactPreference, deletedImages } = req.body;
  const item = await FoundItem.findById(req.params.id);

  if (!item || item.isDeleted) {
    throw ApiError.notFound('Found item not found.');
  }

  // Auth: user must be owner or admin
  const isOwner = item.userId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You are not authorised to edit this item.');
  }

  // Update text fields
  if (itemName) item.itemName = itemName;
  if (category && category !== item.category) {
    let categoryExists = await Category.findOne({ name: category, isActive: true });
    if (!categoryExists) {
      try {
        const details = await generateCategoryDetails(category);
        categoryExists = await Category.create({
          name: category,
          icon: details.icon,
          description: details.description,
          isActive: true,
          itemCount: 0
        });
      } catch (e) {
        throw ApiError.badRequest(`Failed to create new category '${category}'.`);
      }
    }
    
    // Decrement from old, increment in new
    await Category.updateOne({ name: item.category, itemCount: { $gt: 0 } }, { $inc: { itemCount: -1 } });
    await Category.updateOne({ name: category }, { $inc: { itemCount: 1 } });
    item.category = category;
  }
  if (description) item.description = description;
  if (foundLocation) item.foundLocation = foundLocation;
  if (foundDate) item.foundDate = new Date(foundDate);
  if (storedAt !== undefined) item.storedAt = storedAt;
  if (status && status !== item.status) {
    item.status = status;
    if (status === 'claimed' || status === 'closed') {
      item.resolvedAt = new Date();
    }
  }
  if (contactPreference) item.contactPreference = contactPreference;
  if (tags) {
    item.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
  }

  // Handle deletions of images
  let imagesLeft = [...item.images];
  if (deletedImages) {
    const imagesToDelete = Array.isArray(deletedImages) ? deletedImages : [deletedImages];
    const toDeletePublicIds = item.images
      .filter((img) => imagesToDelete.includes(img.url))
      .map((img) => img.publicId);
    
    await deleteMultipleImages(toDeletePublicIds.map(id => ({ publicId: id })));
    imagesLeft = item.images.filter((img) => !imagesToDelete.includes(img.url));
  }

  // Handle new images
  let newImages = [];
  if (req.files && req.files.length > 0) {
    const spaceLeft = 5 - imagesLeft.length;
    if (spaceLeft <= 0) {
      throw ApiError.badRequest('Maximum 5 images allowed. Delete some to upload new ones.');
    }
    const filesToUpload = req.files.slice(0, spaceLeft);
    newImages = await uploadMultipleImages(filesToUpload, 'found-items');
  }

  item.images = [...imagesLeft, ...newImages];
  await item.save();

  // Rematching
  (async () => {
    try {
      let analysisResult = null;
      if (newImages.length > 0) {
        analysisResult = await analyzeItemImage('FoundItem', item._id, newImages[0].url, item.itemName, item.description);
      }
      
      const textKeywords = await generateKeywordsFromText(item.itemName, item.description);
      let finalKeywords = [...textKeywords];
      
      if (analysisResult) {
        const imgLabels = analysisResult.labels ? analysisResult.labels.map(l => l.toLowerCase()) : [];
        const imgColors = analysisResult.colors ? analysisResult.colors.map(c => c.toLowerCase()) : [];
        finalKeywords = [...new Set([...finalKeywords, ...imgLabels, ...imgColors])];
      } else {
        // Fetch existing analysis if no new image was added
        const ImageAnalysis = (await import('../models/ImageAnalysis.js')).default;
        const existingAnalysis = await ImageAnalysis.findOne({ itemId: item._id, itemType: 'FoundItem' });
        if (existingAnalysis) {
          const imgLabels = existingAnalysis.labels ? existingAnalysis.labels.map(l => l.toLowerCase()) : [];
          const imgColors = existingAnalysis.colors ? existingAnalysis.colors.map(c => c.toLowerCase()) : [];
          finalKeywords = [...new Set([...finalKeywords, ...imgLabels, ...imgColors])];
        }
      }

      if (finalKeywords.length > 0) {
        item.aiKeywords = finalKeywords;
        await item.save();
      }

      await runMatchingForItem(item, 'FoundItem');
    } catch (err) {
      console.error('❌ Background processing on update failed:', err);
    }
  })();

  // Invalidate cache
  await deleteCache(['foundItems:*', 'cache:/api/found-items*']);

  ApiResponse.ok(item, 'Found item updated successfully. Rematching completed.').send(res);
});

/**
 * Delete a found item. (Hard or soft delete depending on logic, here we do soft delete for safety)
 */
const deleteFoundItem = asyncHandler(async (req, res) => {
  const item = await FoundItem.findById(req.params.id);

  if (!item || item.isDeleted) {
    throw ApiError.notFound('Found item not found.');
  }

  const isOwner = item.userId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You are not authorised to delete this item.');
  }

  // Soft delete
  item.isDeleted = true;
  item.status = 'claimed'; // Mark claimed/closed
  await item.save();

  // Decrement category count
  await Category.updateOne({ name: item.category, itemCount: { $gt: 0 } }, { $inc: { itemCount: -1 } });

  // Delete matches
  await Match.deleteMany({ foundItemId: item._id });

  // Invalidate cache
  await deleteCache(['foundItems:*', 'cache:/api/found-items*']);

  ApiResponse.noContent('Found item deleted successfully.').send(res);
});

/**
 * Connect to a found item (This is mine).
 */
const connectFoundItem = asyncHandler(async (req, res) => {
  const foundItem = await FoundItem.findById(req.params.id).populate('userId', 'name email phoneNumber');
  
  if (!foundItem || foundItem.isDeleted) {
    throw ApiError.notFound('Found item not found');
  }

  if (foundItem.status !== 'available' && foundItem.status !== 'matched') {
    throw ApiError.badRequest('This item is no longer available to connect.');
  }

  if (foundItem.userId._id.toString() === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot connect to your own reported item.');
  }

  foundItem.status = 'in_progress';
  foundItem.connectedUserId = req.user._id;
  foundItem.connectedAt = new Date();
  foundItem.reminderSent = false;
  await foundItem.save();

  await deleteCache(['foundItems:*', 'cache:/api/found-items*']);

  import('../services/emailService.js').then((emailService) => {
    // Send email to Founder
    emailService.sendEmail(
      foundItem.userId.email,
      'Someone Claimed Your Found Item',
      emailService.templates.claimReceived(
        foundItem.userId.name,
        foundItem.itemName,
        req.user.name
      )
    ).catch(err => console.error('Failed to send connect email:', err));

    // Send email to Requester
    emailService.sendEmail(
      req.user.email,
      'Contact Details - You Claimed an Item',
      emailService.templates.claimApprovedFounder(
        req.user.name,
        foundItem.itemName,
        `Name: ${foundItem.userId.name}\nEmail: ${foundItem.userId.email}\nPhone: ${foundItem.userId.phoneNumber || 'N/A'}`
      )
    ).catch(err => console.error('Failed to send connect email:', err));
  });

  ApiResponse.ok(foundItem, 'Connected successfully. Contact details will be emailed.').send(res);
});

/**
 * Resolve a found item (Mark as Done).
 */
const resolveFoundItem = asyncHandler(async (req, res) => {
  const foundItem = await FoundItem.findById(req.params.id);

  if (!foundItem || foundItem.isDeleted) {
    throw ApiError.notFound('Found item not found');
  }

  if (foundItem.status !== 'in_progress') {
    throw ApiError.badRequest('Item must be connected (in progress) before resolving.');
  }

  const isOwner = foundItem.userId.toString() === req.user._id.toString();
  const isConnectedUser = foundItem.connectedUserId && foundItem.connectedUserId.toString() === req.user._id.toString();

  if (!isOwner && !isConnectedUser && req.user.role !== 'admin') {
    throw ApiError.forbidden('Not authorized to resolve this item');
  }

  foundItem.status = 'claimed';
  foundItem.resolvedAt = new Date();
  await foundItem.save();

  await deleteCache(['foundItems:*', 'cache:/api/found-items*']);

  ApiResponse.ok(foundItem, 'Item resolved successfully').send(res);
});

/**
 * Cancel a found item connection (No, not resolved).
 */
const cancelConnectionFoundItem = asyncHandler(async (req, res) => {
  const foundItem = await FoundItem.findById(req.params.id);

  if (!foundItem || foundItem.isDeleted) {
    throw ApiError.notFound('Found item not found');
  }

  if (foundItem.status !== 'in_progress') {
    throw ApiError.badRequest('Item must be connected to cancel the connection.');
  }

  const isOwner = foundItem.userId.toString() === req.user._id.toString();
  const isConnectedUser = foundItem.connectedUserId && foundItem.connectedUserId.toString() === req.user._id.toString();

  if (!isOwner && !isConnectedUser && req.user.role !== 'admin') {
    throw ApiError.forbidden('Not authorized to cancel this connection');
  }

  foundItem.status = 'available';
  foundItem.connectedUserId = null;
  foundItem.connectedAt = null;
  foundItem.reminderSent = false;
  await foundItem.save();

  await deleteCache(['foundItems:*', 'cache:/api/found-items*']);

  ApiResponse.ok(foundItem, 'Connection cancelled. Item is available again.').send(res);
});

export {
  createFoundItem,
  getFoundItems,
  getFoundItemById,
  updateFoundItem,
  deleteFoundItem,
  connectFoundItem,
  resolveFoundItem,
  cancelConnectionFoundItem
};
