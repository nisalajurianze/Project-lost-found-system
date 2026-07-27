import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';
import webpush from 'web-push';
import { isNotificationChannelEnabled, notificationCategory } from './notificationPreferenceService.js';

let vapidConfigured = false;
const configureVapid = () => {
  if (vapidConfigured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.invalid',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
  vapidConfigured = true;
  return true;
};

const notificationUrl = (relatedItem = {}) => {
  if (!relatedItem.itemId) return '/dashboard/notifications';
  const routes = {
    LostItem: `/lost-items/${relatedItem.itemId}`,
    FoundItem: `/found-items/${relatedItem.itemId}`,
    Match: '/dashboard/matches',
    ClaimRequest: '/dashboard/claims',
  };
  return routes[relatedItem.itemType] || '/dashboard/notifications';
};

const createNotification = async ({
  userId,
  title,
  message,
  type = 'system',
  relatedItem = {},
  dedupeKey = null,
}) => {
  if (!userId) return null;

  try {
    let notification;
    if (dedupeKey) {
      notification = await Notification.findOneAndUpdate(
        { userId, dedupeKey },
        {
          $setOnInsert: {
            userId,
            title,
            message,
            type,
            dedupeKey,
            relatedItem: {
              itemType: relatedItem.itemType || null,
              itemId: relatedItem.itemId || null,
            },
            isRead: false,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } else {
      notification = await Notification.create({
        userId,
        title,
        message,
        type,
        relatedItem: {
          itemType: relatedItem.itemType || null,
          itemId: relatedItem.itemId || null,
        },
      });
    }

    const payload = {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      relatedItem: notification.relatedItem,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };

    const io = getIO();
    if (io) io.to(`user:${String(userId)}`).emit('notification', payload);

    const user = await User.findById(userId).select('+pushSubscription notificationPreferences');
    const category = notificationCategory(notification.type);
    const pushAllowed = isNotificationChannelEnabled(user?.notificationPreferences, 'push', category);
    if (pushAllowed && user?.pushSubscription?.endpoint && configureVapid()) {
      try {
        await webpush.sendNotification(user.pushSubscription, JSON.stringify({
          title: notification.title,
          body: notification.message,
          icon: '/logo.png',
          data: { url: notificationUrl(notification.relatedItem) },
        }), { TTL: 300, urgency: 'normal' });
      } catch (error) {
        console.warn('[push] delivery failed', { statusCode: error.statusCode, userId: String(userId) });
        if ([404, 410].includes(error.statusCode)) {
          await User.updateOne({ _id: userId }, { $unset: { pushSubscription: 1 } });
        }
      }
    }
    return notification;
  } catch (error) {
    if (error?.code === 11000 && dedupeKey) {
      return Notification.findOne({ userId, dedupeKey });
    }
    console.error('[notification] creation failed', { error: error.message, userId: String(userId) });
    return null;
  }
};

const createBulkNotifications = async (notifications) => {
  const results = await Promise.allSettled(notifications.map((entry) => createNotification(entry)));
  return results.filter((entry) => entry.status === 'fulfilled' && entry.value).map((entry) => entry.value);
};

const emitToAdmins = (event, data) => {
  const io = getIO();
  if (io) io.to('admins').emit(event, data);
};

export { createNotification, createBulkNotifications, emitToAdmins };
