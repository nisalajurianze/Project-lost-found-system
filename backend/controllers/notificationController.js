// ============================================
// Notification Controller
// Handles user in-app notifications
// ============================================

import Notification from '../models/Notification.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paginate } from '../utils/pagination.js';

/**
 * Retrieve notifications for the logged-in user.
 * Filters: isRead (true/false)
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const filter = { userId };

  if (req.query.isRead !== undefined) {
    filter.isRead = req.query.isRead === 'true';
  }

  const totalDocs = await Notification.countDocuments(filter);
  const pagination = paginate(req.query, totalDocs);

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);

  ApiResponse.ok({ notifications, pagination }, 'Notifications retrieved successfully.').send(res);
});

/**
 * Mark a specific notification as read.
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });

  if (!notification) {
    throw ApiError.notFound('Notification not found.');
  }

  notification.isRead = true;
  await notification.save();

  ApiResponse.ok(notification, 'Notification marked as read.').send(res);
});

/**
 * Mark all user notifications as read.
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany({ userId, isRead: false }, { isRead: true });

  ApiResponse.ok(null, 'All notifications marked as read.').send(res);
});

/**
 * Delete a single notification.
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

  if (!notification) {
    throw ApiError.notFound('Notification not found.');
  }

  ApiResponse.noContent('Notification deleted successfully.').send(res);
});

export {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
