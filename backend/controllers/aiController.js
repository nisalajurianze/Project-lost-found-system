// ============================================
// AI Controller
// Handles AI endpoints for the frontend
// ============================================

import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { uploadMultipleImages } from '../services/cloudinaryService.js';
import { suggestDetailsFromImage } from '../services/imageAnalysisService.js';

/**
 * Suggests item details (name, category, description) from an uploaded image.
 * This is used for the Auto-Fill feature when reporting a lost/found item.
 */
export const suggestItemDetails = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No image provided for AI analysis.');
  }

  // 1. Upload to Cloudinary to get a public URL for OpenRouter
  // We use the same service, but pass an array of one file
  const uploadedUrls = await uploadMultipleImages([req.file], 'ai-suggestions');
  const imageUrl = uploadedUrls[0]?.url;

  if (!imageUrl) {
    throw ApiError.internal('Failed to upload image for AI analysis.');
  }

  // 2. Pass to AI for suggestion
  const suggestions = await suggestDetailsFromImage(imageUrl);

  // 3. Return JSON suggestions
  res.status(200).json(
    ApiResponse.success(suggestions, 'AI suggestions generated successfully')
  );
});
