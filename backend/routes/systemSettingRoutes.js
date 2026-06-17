import express from 'express';
import {
  getPublicSetting,
  updateSetting
} from '../controllers/systemSettingController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Public routes
router.get('/public/:key', getPublicSetting);

// Admin routes
router.put('/:key', protect, authorize('admin'), updateSetting);

export default router;
