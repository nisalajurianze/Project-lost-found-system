// ============================================
// Lost Item Controller
// Handles creation, listing, updating, and deleting of Lost Items
// ============================================

import LostItem from '../models/LostItem.js';
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
 * Report a lost item.
 * Uploads images, runs image analysis in background, and triggers matching.
 */
const createLostItem = asyncHandler(async (req, res) => {
  const { itemName, category, description, lostLocation, lostDate, tags, contactPreference, contactVisibility } = req.body;
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

  // Parse tags if sent as string
  let parsedTags = [];
  if (tags) {
    parsedTags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
  }

  // Upload images to Cloudinary (using memory buffers)
  let images = [];
  if (req.files && req.files.length > 0) {
    images = await uploadMultipleImages(req.files, 'lost-items');
  }

  // Create lost item
  const lostItem = await LostItem.create({
    userId,
    itemName,
    category: finalCategoryName,
    description,
    lostLocation,
    lostDate,
    contactPreference: contactPreference || 'both',
    contactVisibility: contactVisibility || 'request_only',
    tags: parsedTags,
    images,
    status: 'pending'
  });

  // Increment item count in category
  categoryExists.itemCount = (categoryExists.itemCount || 0) + 1;
  await categoryExists.save();

  // Invalidate cache
  await deleteCache(['lostItems:*', 'cache:/api/lost-items*']);

  // Run AI Image Analysis and AI Matching in background (avoid blocking client response)
  // We handle errors locally inside the async IIFE to prevent crash
  (async () => {
    try {
      let analysisResult = null;
      // Analyze first image if uploaded
      if (images.length > 0) {
        analysisResult = await analyzeItemImage('LostItem', lostItem._id, images[0].url, itemName, description);
      } else {
        // Run analysis on text fallback
        analysisResult = await analyzeItemImage('LostItem', lostItem._id, '', itemName, description);
      }
      
      // Generate Keywords from Text (Translates Singlish/Sinhala -> English)
      const textKeywords = await generateKeywordsFromText(itemName, description);
      
      let finalKeywords = [...textKeywords];
      if (analysisResult) {
        const imgLabels = analysisResult.labels ? analysisResult.labels.map(l => l.toLowerCase()) : [];
        const imgColors = analysisResult.colors ? analysisResult.colors.map(c => c.toLowerCase()) : [];
        finalKeywords = [...new Set([...finalKeywords, ...imgLabels, ...imgColors])];
      }

      if (finalKeywords.length > 0) {
        lostItem.aiKeywords = finalKeywords;
        await lostItem.save();
      }

      // Run matching engine
      await runMatchingForItem(lostItem, 'LostItem');
    } catch (err) {
      console.error(`❌ Background processing failed for LostItem ${lostItem._id}:`, err);
    }
  })();

  ApiResponse.created(lostItem, 'Lost item reported successfully. AI matching triggered.').send(res);
});

/**
 * Get all lost items (with pagination, search, and filters).
 */
const getLostItems = asyncHandler(async (req, res) => {
  const cacheKey = `lostItems:${JSON.stringify(req.query)}`;
  
  // Try Cache
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    return ApiResponse.ok(cachedData, 'Lost items retrieved from cache.').send(res);
  }

  const filter = { isDeleted: { $ne: true } };

  // 1. Text Search (using compound text index)
  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }

  // 2. Category Filter
  if (req.query.category) {
    filter.category = req.query.category;
  }

  // 3. Status Filter (default to pending/matched/in_progress for public display)
  if (req.query.status) {
    if (req.query.status !== 'all') {
      filter.status = req.query.status;
    }
  } else {
    // Only return items active in system
    filter.status = { $in: ['pending', 'matched', 'in_progress'] };
  }

  // 4. Date Range Filter
  if (req.query.startDate || req.query.endDate) {
    filter.lostDate = {};
    if (req.query.startDate) {
      filter.lostDate.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.lostDate.$lte = new Date(req.query.endDate);
    }
  }

  // 5. User Specific Filter (for "My Reported Items")
  if (req.query.userId) {
    filter.userId = req.query.userId;
  }

  // Get total count
  const totalDocs = await LostItem.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);

  // Sorting
  const allowedSort = { lostDate: 1, createdAt: 1, itemName: 1 };
  const sort = buildSort(req.query.sort, allowedSort, { createdAt: -1 });

  // Execute query
  const items = await LostItem.find(filter)
    .populate('userId', 'fullName profileImage')
    .sort(sort)
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();

  const responsePayload = { items, pagination };
  
  // Save to cache (5 minutes)
  await setCache(cacheKey, responsePayload, 300);

  ApiResponse.ok(responsePayload, 'Lost items retrieved successfully.').send(res);
});

/**
 * Get lost item by ID.
 */
const getLostItemById = asyncHandler(async (req, res) => {
  const item = await LostItem.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
    .populate('userId', 'fullName email phone profileImage studentId')
    .lean();

  if (!item) {
    throw ApiError.notFound('Lost item not found.');
  }

  ApiResponse.ok(item, 'Lost item retrieved successfully.').send(res);
});

/**
 * Update a lost item.
 */
const updateLostItem = asyncHandler(async (req, res) => {
  const { itemName, category, description, lostLocation, lostDate, status, tags, contactPreference, contactVisibility, deletedImages } = req.body;
  const item = await LostItem.findById(req.params.id);

  if (!item || item.isDeleted) {
    throw ApiError.notFound('Lost item not found.');
  }

  // Authorisation check: user must be owner or admin
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
  if (lostLocation) item.lostLocation = lostLocation;
  if (lostDate) item.lostDate = new Date(lostDate);
  if (status && status !== item.status) {
    item.status = status;
    if (status === 'claimed' || status === 'closed') {
      item.resolvedAt = new Date();
    }
  }
  if (contactPreference) item.contactPreference = contactPreference;
  if (contactVisibility) item.contactVisibility = contactVisibility;
  if (tags) {
    item.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
  }

  // Handle image deletions
  let imagesLeft = [...item.images];
  if (deletedImages) {
    const imagesToDelete = Array.isArray(deletedImages) ? deletedImages : [deletedImages];
    // Delete from Cloudinary
    const toDeletePublicIds = item.images
      .filter((img) => imagesToDelete.includes(img.url))
      .map((img) => img.publicId);
    
    await deleteMultipleImages(toDeletePublicIds.map(id => ({ publicId: id })));
    
    // Remove from array
    imagesLeft = item.images.filter((img) => !imagesToDelete.includes(img.url));
  }

  // Handle new image uploads
  let newImages = [];
  if (req.files && req.files.length > 0) {
    const spaceLeft = 5 - imagesLeft.length;
    if (spaceLeft <= 0) {
      throw ApiError.badRequest('Maximum 5 images allowed per item. Delete some to upload new ones.');
    }
    const filesToUpload = req.files.slice(0, spaceLeft);
    newImages = await uploadMultipleImages(filesToUpload, 'lost-items');
  }

  item.images = [...imagesLeft, ...newImages];
  await item.save();

  // Re-run matching and image analysis in background if details changed significantly
  (async () => {
    try {
      let analysisResult = null;
      if (newImages.length > 0) {
        analysisResult = await analyzeItemImage('LostItem', item._id, newImages[0].url, item.itemName, item.description);
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
        const existingAnalysis = await ImageAnalysis.findOne({ itemId: item._id, itemType: 'LostItem' });
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

      await runMatchingForItem(item, 'LostItem');
    } catch (err) {
      console.error('❌ Background processing on update failed:', err);
    }
  })();

  // Invalidate cache
  await deleteCache(['lostItems:*', 'cache:/api/lost-items*']);

  ApiResponse.ok(item, 'Lost item updated successfully. Rematching completed.').send(res);
});

/**
 * Delete a lost item (soft delete).
 */
const deleteLostItem = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id);

  if (!item || item.isDeleted) {
    throw ApiError.notFound('Lost item not found.');
  }

  // Authorisation check: owner or admin
  const isOwner = item.userId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You are not authorised to delete this item.');
  }

  // Soft delete
  item.isDeleted = true;
  item.status = 'closed';
  await item.save();

  // Decrement category count
  await Category.updateOne({ name: item.category, itemCount: { $gt: 0 } }, { $inc: { itemCount: -1 } });

  // Delete all associated Match entries
  await Match.deleteMany({ lostItemId: item._id });

  // Invalidate cache
  await deleteCache(['lostItems:*', 'cache:/api/lost-items*']);

  ApiResponse.noContent('Lost item deleted successfully.').send(res);
});

/**
 * Connect to a lost item (I have this).
 */
const connectLostItem = asyncHandler(async (req, res) => {
  const lostItem = await LostItem.findById(req.params.id).populate('userId', 'name email phoneNumber');
  
  if (!lostItem || lostItem.isDeleted) {
    throw ApiError.notFound('Lost item not found');
  }

  if (lostItem.status !== 'pending' && lostItem.status !== 'matched') {
    throw ApiError.badRequest('This item is no longer available to connect.');
  }

  if (lostItem.userId._id.toString() === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot connect to your own reported item.');
  }

  lostItem.status = 'in_progress';
  lostItem.connectedUserId = req.user._id;
  lostItem.connectedAt = new Date();
  lostItem.reminderSent = false;
  await lostItem.save();

  await deleteCache(['lostItems:*', 'cache:/api/lost-items*']);

  import('../services/emailService.js').then((emailService) => {
    // Send email to Loser
    emailService.sendEmail(
      lostItem.userId.email,
      'Someone Found Your Lost Item',
      emailService.templates.claimReceived(
        lostItem.userId.name,
        lostItem.itemName,
        req.user.name
      )
    ).catch(err => console.error('Failed to send connect email:', err));

    // Send email to Finder
    emailService.sendEmail(
      req.user.email,
      'Contact Details - You Found an Item',
      emailService.templates.claimApprovedFounder(
        req.user.name,
        lostItem.itemName,
        `Name: ${lostItem.userId.name}\nEmail: ${lostItem.userId.email}\nPhone: ${lostItem.userId.phoneNumber || 'N/A'}`
      )
    ).catch(err => console.error('Failed to send connect email:', err));
  });

  ApiResponse.ok(lostItem, 'Connected successfully. Contact details will be emailed.').send(res);
});

/**
 * Resolve a lost item (Mark as Done).
 */
const resolveLostItem = asyncHandler(async (req, res) => {
  const lostItem = await LostItem.findById(req.params.id);

  if (!lostItem || lostItem.isDeleted) {
    throw ApiError.notFound('Lost item not found');
  }

  if (lostItem.status !== 'in_progress') {
    throw ApiError.badRequest('Item must be connected (in progress) before resolving.');
  }

  const isOwner = lostItem.userId.toString() === req.user._id.toString();
  const isConnectedUser = lostItem.connectedUserId && lostItem.connectedUserId.toString() === req.user._id.toString();

  if (!isOwner && !isConnectedUser && req.user.role !== 'admin') {
    throw ApiError.forbidden('Not authorized to resolve this item');
  }

  lostItem.status = 'claimed';
  lostItem.resolvedAt = new Date();
  await lostItem.save();

  await deleteCache(['lostItems:*', 'cache:/api/lost-items*']);

  ApiResponse.ok(lostItem, 'Item resolved successfully').send(res);
});

/**
 * Cancel a lost item connection (No, not resolved).
 */
const cancelConnectionLostItem = asyncHandler(async (req, res) => {
  const lostItem = await LostItem.findById(req.params.id);

  if (!lostItem || lostItem.isDeleted) {
    throw ApiError.notFound('Lost item not found');
  }

  if (lostItem.status !== 'in_progress') {
    throw ApiError.badRequest('Item must be connected to cancel the connection.');
  }

  const isOwner = lostItem.userId.toString() === req.user._id.toString();
  const isConnectedUser = lostItem.connectedUserId && lostItem.connectedUserId.toString() === req.user._id.toString();

  if (!isOwner && !isConnectedUser && req.user.role !== 'admin') {
    throw ApiError.forbidden('Not authorized to cancel this connection');
  }

  lostItem.status = 'pending';
  lostItem.connectedUserId = null;
  lostItem.connectedAt = null;
  lostItem.reminderSent = false;
  await lostItem.save();

  await deleteCache(['lostItems:*', 'cache:/api/lost-items*']);

  ApiResponse.ok(lostItem, 'Connection cancelled. Item is pending again.').send(res);
});

export {
  createLostItem,
  getLostItems,
  getLostItemById,
  updateLostItem,
  deleteLostItem,
  connectLostItem,
  resolveLostItem,
  cancelConnectionLostItem
};
