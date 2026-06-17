import express from 'express';
import {
  getPublicSetting,
  updateSetting
} from '../controllers/systemSettingController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/public/:key', getPublicSetting);

// Admin routes
router.put('/:key', protect, admin, updateSetting);

export default router;
