// ============================================
// Notification Routes
// Real-time notifications endpoints
// ============================================

import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import { mongoIdParam } from '../utils/validators.js';

const router = express.Router();

// Require user authentication for all notifications endpoints
router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', mongoIdParam, validate, markAsRead);
router.delete('/:id', mongoIdParam, validate, deleteNotification);

export default router;
