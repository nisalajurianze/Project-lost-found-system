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

  try {
    // Create base64 string directly from the buffer to send to OpenRouter
    // This avoids uploading temporary images to Cloudinary just for AI auto-fill
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Pass the base64 string to AI for suggestion
    const suggestions = await suggestDetailsFromImage(base64Image);

    // Return JSON suggestions
    res.status(200).json(
      ApiResponse.success(suggestions, 'AI suggestions generated successfully')
    );
  } catch (error) {
    console.error('AI Suggestion Endpoint Error:', error);
    throw ApiError.internal(`AI auto-fill failed: ${error.message}`);
  }
});
