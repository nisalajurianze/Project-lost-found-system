// ============================================
// Notification Controller
// Handles user in-app notifications
// ============================================

import Notification from '../models/Notification.js';
import User from '../models/User.js';
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
    .limit(pagination.limit)
    .lean();
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });

  ApiResponse.ok({ notifications, pagination, unreadCount }, 'Notifications retrieved successfully.').send(res);
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

/**
 * Save Push Subscription for the logged-in user.
 */
const subscribeToPush = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    throw ApiError.badRequest('Invalid push subscription object.');
  }

  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('User not found.');

  user.pushSubscription = subscription;
  await user.save();

  ApiResponse.ok(null, 'Push subscription saved.').send(res);
});

/**
 * Remove Push Subscription for the logged-in user.
 */
const unsubscribeFromPush = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user && user.pushSubscription) {
    user.pushSubscription = undefined;
    await user.save();
  }

  ApiResponse.ok(null, 'Push subscription removed.').send(res);
});

/**
 * Get VAPID Public Key for the frontend.
 */
const getVapidPublicKey = asyncHandler(async (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw ApiError.internal('Push notifications are not configured on the server.');
  }
  
  ApiResponse.ok({ publicKey }, 'VAPID public key retrieved.').send(res);
});

export {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToPush,
  unsubscribeFromPush,
  getVapidPublicKey
};
