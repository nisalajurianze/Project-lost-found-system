// ============================================
// User Routes
// Profile updates, password changes, and stats
// ============================================

import express from 'express';
import {
  updateProfile,
  changePassword,
  getUserStats
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadProfileImage } from '../middlewares/uploadMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  updateProfileValidator,
  changePasswordValidator
} from '../utils/validators.js';

const router = express.Router();

// All user routes require authentication
router.use(protect);

router.put('/profile', uploadProfileImage, updateProfileValidator, validate, updateProfile);
router.put('/change-password', changePasswordValidator, validate, changePassword);
router.get('/stats', getUserStats);

export default router;
