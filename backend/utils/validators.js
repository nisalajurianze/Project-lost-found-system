// ============================================
// Validators
// express-validator chains for every route
// ============================================

import { body, param, query } from 'express-validator';

// ── Auth Validators ─────────────────────────────────────────────────────

const registerValidator = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2-100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('studentId')
    .trim()
    .notEmpty()
    .withMessage('Student ID is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('Student ID must be 2-30 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, one lowercase, and one number'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
];

const resetPasswordValidator = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, one lowercase, and one number'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, one lowercase, and one number'),
  body('confirmNewPassword')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

// ── User Validators ─────────────────────────────────────────────────────

const updateProfileValidator = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2-100 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('studentId')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Student ID must be 2-30 characters'),
];

// ── Lost Item Validators ────────────────────────────────────────────────

const createLostItemValidator = [
  body('itemName')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 150 })
    .withMessage('Item name cannot exceed 150 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be 10-2000 characters'),
  body('lostLocation')
    .trim()
    .notEmpty()
    .withMessage('Lost location is required')
    .isLength({ max: 300 })
    .withMessage('Location cannot exceed 300 characters'),
  body('lostDate')
    .notEmpty()
    .withMessage('Lost date is required')
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Lost date cannot be in the future');
      }
      return true;
    }),
  body('tags')
    .optional()
    .custom((value) => {
      // Accept both array and comma-separated string
      if (typeof value === 'string') return true;
      if (Array.isArray(value)) return true;
      throw new Error('Tags must be an array or comma-separated string');
    }),
  body('contactPreference')
    .optional()
    .isIn(['email', 'phone', 'both'])
    .withMessage('Contact preference must be email, phone, or both'),
];

const updateLostItemValidator = [
  body('itemName')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Item name cannot exceed 150 characters'),
  body('category')
    .optional()
    .trim(),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be 10-2000 characters'),
  body('lostLocation')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Location cannot exceed 300 characters'),
  body('lostDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Lost date cannot be in the future');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['pending', 'matched', 'claimed', 'closed'])
    .withMessage('Invalid status'),
];

// ── Found Item Validators ───────────────────────────────────────────────

const createFoundItemValidator = [
  body('itemName')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 150 })
    .withMessage('Item name cannot exceed 150 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be 10-2000 characters'),
  body('foundLocation')
    .trim()
    .notEmpty()
    .withMessage('Found location is required')
    .isLength({ max: 300 })
    .withMessage('Location cannot exceed 300 characters'),
  body('foundDate')
    .notEmpty()
    .withMessage('Found date is required')
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Found date cannot be in the future');
      }
      return true;
    }),
  body('storedAt')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Storage location cannot exceed 300 characters'),
  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') return true;
      if (Array.isArray(value)) return true;
      throw new Error('Tags must be an array or comma-separated string');
    }),
  body('contactPreference')
    .optional()
    .isIn(['email', 'phone', 'both'])
    .withMessage('Contact preference must be email, phone, or both'),
];

const updateFoundItemValidator = [
  body('itemName')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Item name cannot exceed 150 characters'),
  body('category')
    .optional()
    .trim(),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be 10-2000 characters'),
  body('foundLocation')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Location cannot exceed 300 characters'),
  body('foundDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Found date cannot be in the future');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['available', 'matched', 'claimed'])
    .withMessage('Invalid status'),
  body('storedAt')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Storage location cannot exceed 300 characters'),
];

// ── Claim Request Validators ────────────────────────────────────────────

const createClaimValidator = [
  body('foundItemId')
    .optional()
    .isMongoId()
    .withMessage('Invalid found item ID'),
  body('lostItemId')
    .optional()
    .isMongoId()
    .withMessage('Invalid lost item ID'),
  body().custom((value) => {
    if (!value.foundItemId && !value.lostItemId) {
      throw new Error('Either foundItemId or lostItemId is required');
    }
    if (value.foundItemId && value.lostItemId) {
      throw new Error('Cannot provide both foundItemId and lostItemId');
    }
    return true;
  }),
  body('proofDescription')
    .trim()
    .notEmpty()
    .withMessage('Proof description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Proof description must be 10-2000 characters'),
  body('matchId')
    .optional()
    .isMongoId()
    .withMessage('Invalid match ID'),
];

const reviewClaimValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected'),
  body('adminRemark')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remark cannot exceed 1000 characters'),
];

// ── Match Validators ────────────────────────────────────────────────────

const updateMatchValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['confirmed', 'rejected'])
    .withMessage('Status must be confirmed or rejected'),
];

// ── Feedback Validators ─────────────────────────────────────────────────

const createFeedbackValidator = [
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be 10-2000 characters'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('category')
    .optional()
    .isIn(['general', 'bug_report', 'feature_request', 'complaint', 'praise'])
    .withMessage('Invalid feedback category'),
];

// ── Category Validators ─────────────────────────────────────────────────

const createCategoryValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 100 })
    .withMessage('Category name cannot exceed 100 characters'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Icon cannot exceed 10 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Description cannot exceed 300 characters'),
];

const updateCategoryValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category name cannot exceed 100 characters'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Icon cannot exceed 10 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Description cannot exceed 300 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// ── Common Validators ───────────────────────────────────────────────────

const mongoIdParam = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
];

const paginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

export {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  updateProfileValidator,
  createLostItemValidator,
  updateLostItemValidator,
  createFoundItemValidator,
  updateFoundItemValidator,
  createClaimValidator,
  reviewClaimValidator,
  updateMatchValidator,
  createFeedbackValidator,
  createCategoryValidator,
  updateCategoryValidator,
  mongoIdParam,
  paginationQuery,
};
