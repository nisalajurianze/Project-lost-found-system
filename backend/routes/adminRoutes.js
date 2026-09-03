// ============================================
// Admin Routes
// Administration dashboard statistics, user management, and system logs
// ============================================

import express from 'express';
import {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  updateUserRole,
  getAdminLogs,
  deleteUser,
  explainAdminAnalytics,
} from '../controllers/adminController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { getAIProviderHealth } from '../controllers/aiController.js';
import authorize from '../middlewares/roleMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import { mongoIdParam, adminUserQueryValidator, adminLogQueryValidator } from '../utils/validators.js';
import { listDuplicateReviews, reviewDuplicateCluster } from '../controllers/duplicateReviewController.js';
import { listAssistantHandoffs, reviewAssistantHandoff } from '../controllers/assistantHandoffController.js';

const router = express.Router();

// Require admin privilege for all routes here
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/ai-health', getAIProviderHealth);
router.post('/analytics/explain', explainAdminAnalytics);
router.get('/users', adminUserQueryValidator, validate, getUsers);
router.put('/users/:id/status', mongoIdParam, validate, updateUserStatus);
router.put('/users/:id/role', mongoIdParam, validate, updateUserRole);
router.delete('/users/:id', mongoIdParam, validate, deleteUser);
router.get('/logs', adminLogQueryValidator, validate, getAdminLogs);
router.get('/duplicate-reviews', listDuplicateReviews);
router.put('/duplicate-reviews/:id', mongoIdParam, validate, reviewDuplicateCluster);
router.get('/assistant-handoffs', listAssistantHandoffs);
router.put('/assistant-handoffs/:id', mongoIdParam, validate, reviewAssistantHandoff);

export default router;
