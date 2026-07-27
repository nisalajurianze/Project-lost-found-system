// ============================================
// Notification Routes
// Real-time notifications endpoints
// ============================================

import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToPush,
  unsubscribeFromPush,
  getVapidPublicKey,
  getNotificationPreferences,
  updateNotificationPreferences
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import { mongoIdParam, notificationQueryValidator, notificationPreferencesValidator, pushSubscriptionValidator } from '../utils/validators.js';

const router = express.Router();

// Public route to get VAPID key
router.get('/push/public-key', getVapidPublicKey);

// Require user authentication for all other notifications endpoints
router.use(protect);

router.get('/preferences', getNotificationPreferences);
router.put('/preferences', notificationPreferencesValidator, validate, updateNotificationPreferences);
router.get('/', notificationQueryValidator, validate, getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', mongoIdParam, validate, markAsRead);
router.delete('/:id', mongoIdParam, validate, deleteNotification);

// Push Notification Routes
router.post('/push/subscribe', pushSubscriptionValidator, validate, subscribeToPush);
router.delete('/push/unsubscribe', unsubscribeFromPush);

export default router;
