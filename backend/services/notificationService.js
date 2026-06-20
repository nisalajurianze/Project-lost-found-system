// ============================================
// Notification Service
// Create DB notifications + emit via Socket.IO
// ============================================

import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';
import webpush from 'web-push';

/**
 * Create a notification in the database and emit it via Socket.IO.
 *
 * @param {object} opts
 * @param {string} opts.userId   - Recipient user's ObjectId
 * @param {string} opts.title    - Short notification title
 * @param {string} opts.message  - Notification body
 * @param {string} opts.type     - Notification type enum value
 * @param {object} [opts.relatedItem] - { itemType, itemId }
 * @returns {Promise<import('mongoose').Document>} Created notification
 */
const createNotification = async ({
  userId,
  title,
  message,
  type = 'system',
  relatedItem = {},
}) => {
  if (!userId) {
    console.warn(`⚠️ Attempted to create notification without userId. Title: ${title}`);
    return null;
  }

  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      relatedItem: {
        itemType: relatedItem.itemType || null,
        itemId: relatedItem.itemId || null,
      },
    });

    // Attempt real-time delivery via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        relatedItem: notification.relatedItem,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });
    }

    // Attempt Native Web Push Notification delivery
    const user = await User.findById(userId).select('+pushSubscription');
    if (user && user.pushSubscription && user.pushSubscription.endpoint) {
      // Configure web-push with VAPID keys if they exist in the env
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:smartlostandfound.seusl@gmail.com',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        
        const pushPayload = JSON.stringify({
          title: notification.title,
          body: notification.message,
          icon: '/android-chrome-192x192.png',
          data: {
            url: notification.relatedItem?.itemType ? `/${notification.relatedItem.itemType === 'FoundItem' ? 'found-items' : 'lost-items'}/${notification.relatedItem.itemId}` : '/'
          }
        });

        try {
          await webpush.sendNotification(user.pushSubscription, pushPayload);
        } catch (pushErr) {
          console.warn(`⚠️ Failed to send web push notification: ${pushErr.message}`);
          if (pushErr.statusCode === 410) {
            // Subscription has expired or is no longer valid, remove it
            user.pushSubscription = undefined;
            await user.save();
          }
        }
      }
    }

    return notification;
  } catch (error) {
    // Don't let notification failures crash the main flow
    console.error(`❌ Notification creation error: ${error.message}`);
    return null;
  }
};

/**
 * Create notifications for multiple users.
 *
 * @param {Array<object>} notifications - Array of notification option objects
 * @returns {Promise<Array>}
 */
const createBulkNotifications = async (notifications) => {
  const results = await Promise.allSettled(
    notifications.map((n) => createNotification(n))
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
};

/**
 * Emit an event to the admin room.
 *
 * @param {string} event - Event name
 * @param {any}    data  - Event payload
 */
const emitToAdmins = (event, data) => {
  const io = getIO();
  if (io) {
    io.to('admin_room').emit(event, data);
  }
};

export { createNotification, createBulkNotifications, emitToAdmins };
