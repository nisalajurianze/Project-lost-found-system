// ============================================
// Feedback Controller
// Handles user platform feedback & admin responses
// ============================================

import Feedback from '../models/Feedback.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';

/**
 * Submit feedback for the platform.
 */
const createFeedback = asyncHandler(async (req, res) => {
  const { subject, message, rating, category } = req.body;
  const userId = req.user._id;

  const feedback = await Feedback.create({
    userId,
    subject,
    message,
    rating,
    category: category || 'general',
    status: 'pending'
  });

  ApiResponse.created(feedback, 'Thank you for your feedback! It has been submitted successfully.').send(res);
});

/**
 * Get all feedback (Admin only).
 * Filters: category, rating, status.
 */
const getFeedback = asyncHandler(async (req, res) => {
  const { category, rating, status } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (rating) filter.rating = parseInt(rating, 10);
  if (status) filter.status = status;

  const totalDocs = await Feedback.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);

  const feedbacks = await Feedback.find(filter)
    .populate('userId', 'fullName email studentId profileImage')
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  ApiResponse.ok({ feedbacks, pagination }, 'Feedback retrieved successfully.').send(res);
});

/**
 * Respond to a feedback item (Admin only).
 */
const respondToFeedback = asyncHandler(async (req, res) => {
  const { adminResponse, status } = req.body;
  
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    throw ApiError.notFound('Feedback item not found.');
  }

  if (adminResponse !== undefined) {
    feedback.adminResponse = adminResponse;
  }
  
  feedback.status = status || 'reviewed';
  await feedback.save();

  ApiResponse.ok(feedback, 'Feedback response saved successfully.').send(res);
});

export {
  createFeedback,
  getFeedback,
  respondToFeedback
};
