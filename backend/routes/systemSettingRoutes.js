import express from 'express';
import {
  getPublicSetting,
  getSetting,
  updateSetting,
  triggerCleanup
} from '../controllers/systemSettingController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Public routes
router.get('/public/:key', getPublicSetting);

// Admin routes
router.post('/run-cleanup', protect, authorize('admin'), triggerCleanup);
router.get('/:key', protect, authorize('admin'), getSetting);
router.put('/:key', protect, authorize('admin'), updateSetting);

export default router;
