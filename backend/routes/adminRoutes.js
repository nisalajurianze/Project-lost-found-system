// ============================================
// Admin Routes
// Administration dashboard statistics, user management, and system logs
// ============================================

import express from 'express';
import {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  getAdminLogs
} from '../controllers/adminController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import { mongoIdParam } from '../utils/validators.js';

const router = express.Router();

// Require admin privilege for all routes here
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/status', mongoIdParam, validate, updateUserStatus);
router.get('/logs', getAdminLogs);

export default router;
