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
import { normalizeNotificationPreferences } from '../services/notificationPreferenceService.js';

/**
 * Retrieve notifications for the logged-in user.
 * Filters: isRead (true/false)
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const filter = { userId };

  if (req.query.isRead !== undefined) {
    if (!['true', 'false'].includes(String(req.query.isRead))) {
      throw ApiError.badRequest('isRead must be true or false.');
    }
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


const getNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationPreferences');
  if (!user) throw ApiError.notFound('User not found.');
  ApiResponse.ok(normalizeNotificationPreferences(user.notificationPreferences), 'Notification preferences retrieved.').send(res);
});

const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const preferences = normalizeNotificationPreferences(req.body);
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { notificationPreferences: preferences } },
    { new: true, runValidators: true },
  ).select('notificationPreferences');
  if (!user) throw ApiError.notFound('User not found.');
  ApiResponse.ok(normalizeNotificationPreferences(user.notificationPreferences), 'Notification preferences updated.').send(res);
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
  if (!subscription || typeof subscription !== 'object' || Array.isArray(subscription)) {
    throw ApiError.badRequest('Invalid push subscription object.');
  }

  let endpoint;
  try { endpoint = new URL(String(subscription.endpoint || '')); } catch { throw ApiError.badRequest('Invalid push subscription endpoint.'); }
  if (endpoint.protocol !== 'https:' || endpoint.href.length > 2048) {
    throw ApiError.badRequest('Push subscription endpoint must be a valid HTTPS URL.');
  }

  const p256dh = String(subscription.keys?.p256dh || '');
  const auth = String(subscription.keys?.auth || '');
  if (!p256dh || p256dh.length > 512 || !auth || auth.length > 256) {
    throw ApiError.badRequest('Push subscription keys are invalid.');
  }

  const normalizedSubscription = {
    endpoint: endpoint.href,
    expirationTime: Number.isFinite(subscription.expirationTime) ? subscription.expirationTime : null,
    keys: { p256dh, auth },
  };

  const user = await User.findById(req.user._id).select('+pushSubscription');
  if (!user) throw ApiError.notFound('User not found.');

  user.pushSubscription = normalizedSubscription;
  await user.save();

  ApiResponse.ok(null, 'Push subscription saved.').send(res);
});

/**
 * Remove Push Subscription for the logged-in user.
 */
const unsubscribeFromPush = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+pushSubscription');
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
    throw ApiError.serviceUnavailable('Push notifications are not configured on the server.');
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
  getVapidPublicKey,
  getNotificationPreferences,
  updateNotificationPreferences
};
