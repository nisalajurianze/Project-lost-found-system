// ============================================
// Validators
// express-validator chains for every route
// ============================================

import { body, param, query } from 'express-validator';


const validateTags = (value) => {
  const tags = Array.isArray(value) ? value : String(value || '').split(',');
  const cleaned = tags.map((entry) => String(entry).normalize('NFKC').trim()).filter(Boolean);
  if (cleaned.length > 12) throw new Error('A maximum of 12 tags is allowed');
  if (cleaned.some((entry) => entry.length > 40)) throw new Error('Each tag must be 40 characters or fewer');
  return true;
};

const contactFields = [
  body('contactPreference').optional().isIn(['email', 'phone', 'both']).withMessage('Contact preference must be email, phone, or both'),
  body('contactVisibility').optional().isIn(['public', 'request_only']).withMessage('Invalid contact visibility'),
];

const validateList = (value, { maxItems, maxLength, label }) => {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  const cleaned = values.map((entry) => String(entry).normalize('NFKC').trim()).filter(Boolean);
  if (cleaned.length > maxItems) throw new Error(`A maximum of ${maxItems} ${label} entries is allowed`);
  if (cleaned.some((entry) => entry.length > maxLength)) throw new Error(`Each ${label} entry must be ${maxLength} characters or fewer`);
  return true;
};

const itemAttributeFields = [
  body('brand').optional().trim().isLength({ max: 100 }).withMessage('Brand cannot exceed 100 characters'),
  body('model').optional().trim().isLength({ max: 120 }).withMessage('Model cannot exceed 120 characters'),
  body('material').optional().trim().isLength({ max: 100 }).withMessage('Material cannot exceed 100 characters'),
  body('colors').optional().custom((value) => validateList(value, { maxItems: 6, maxLength: 40, label: 'colour' })),
  body('uniqueFeatures').optional().custom((value) => validateList(value, { maxItems: 12, maxLength: 160, label: 'unique feature' })),
];

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
    .isLength({ min: 12, max: 128 })
    .withMessage('Password must be 12-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .withMessage('Password must contain uppercase, lowercase, number, and symbol'),
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

const verifyEmailValidator = [
  body('token').isString().isLength({ min: 32, max: 512 }).withMessage('A valid verification token is required'),
];

const googleLoginValidator = [
  body('idToken').isString().isLength({ min: 20, max: 10000 }).withMessage('A valid Google ID token is required'),
];

const resetPasswordValidator = [
  body('token').isString().isLength({ min: 32, max: 512 }).withMessage('A valid reset token is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 12, max: 128 })
    .withMessage('Password must be 12-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .withMessage('Password must contain uppercase, lowercase, number, and symbol'),
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
    .isLength({ min: 12, max: 128 })
    .withMessage('Password must be 12-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .withMessage('Password must contain uppercase, lowercase, number, and symbol'),
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
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('studentId')
    .optional({ checkFalsy: true })
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
  body('tags').optional().custom(validateTags),
  ...itemAttributeFields,
  ...contactFields,
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
  body('tags').optional().custom(validateTags),
  ...itemAttributeFields,
  ...contactFields,
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
  body('tags').optional().custom(validateTags),
  ...itemAttributeFields,
  ...contactFields,
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
  body('storedAt')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Storage location cannot exceed 300 characters'),
  body('tags').optional().custom(validateTags),
  ...itemAttributeFields,
  ...contactFields,
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
  body('verificationAnswers')
    .optional()
    .custom((value) => {
      let parsed = value;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { throw new Error('Verification answers must be valid JSON'); }
      }
      if (!Array.isArray(parsed) || parsed.length > 5) throw new Error('Verification answers must contain at most 5 entries');
      for (const entry of parsed) {
        const question = String(entry?.question || '').trim();
        const answer = String(entry?.answer || '').trim();
        if (!question || question.length > 300) throw new Error('Each verification question must be 1-300 characters');
        if (answer.length < 2 || answer.length > 1000) throw new Error('Each verification answer must be 2-1000 characters');
      }
      return true;
    }),
];

const claimQuestionParams = [
  param('itemType').isIn(['FoundItem', 'LostItem']).withMessage('Invalid claim item type'),
  param('itemId').isMongoId().withMessage('Invalid item ID'),
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
    .notEmpty()
    .withMessage('Category name cannot be empty')
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


const itemIdParam = [
  param('itemId').isMongoId().withMessage('Invalid item ID format'),
];

const notificationQueryValidator = [
  query('isRead').optional().isIn(['true', 'false']).withMessage('isRead must be true or false'),
  ...paginationQuery,
];

const notificationPreferencesValidator = [
  body('pushEnabled').isBoolean().withMessage('pushEnabled must be boolean'),
  body('emailEnabled').isBoolean().withMessage('emailEnabled must be boolean'),
  ...['matches', 'claims', 'handover', 'reminders', 'system'].map((key) =>
    body(`categories.${key}`).isBoolean().withMessage(`categories.${key} must be boolean`)
  ),
  body().custom((value) => {
    const allowed = new Set(['pushEnabled', 'emailEnabled', 'categories']);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Notification preferences must be an object');
    if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('Unknown notification preference field');
    const categoryKeys = Object.keys(value.categories || {});
    const allowedCategories = new Set(['matches', 'claims', 'handover', 'reminders', 'system']);
    if (categoryKeys.some((key) => !allowedCategories.has(key))) throw new Error('Unknown notification category');
    return true;
  }),
];

const pushSubscriptionValidator = [
  body('subscription').isObject().withMessage('A push subscription object is required'),
  body('subscription.endpoint')
    .isURL({ protocols: ['https'], require_protocol: true, require_valid_protocol: true })
    .withMessage('Push endpoint must be a valid HTTPS URL')
    .isLength({ max: 2048 })
    .withMessage('Push endpoint is too long'),
  body('subscription.keys.p256dh')
    .isString().isLength({ min: 1, max: 512 })
    .withMessage('Invalid p256dh key'),
  body('subscription.keys.auth')
    .isString().isLength({ min: 1, max: 256 })
    .withMessage('Invalid auth key'),
  body('subscription.expirationTime')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('expirationTime must be null or a non-negative integer'),
];

const handoverCancellationValidator = [
  body('reason')
    .exists({ checkFalsy: true }).withMessage('Cancellation reason is required')
    .isString().withMessage('Cancellation reason must be text')
    .trim()
    .isLength({ min: 5, max: 1000 }).withMessage('Cancellation reason must be between 5 and 1000 characters'),
];

const matchQueryValidator = [
  query('status').optional().isIn(['suggested', 'confirmed', 'rejected']).withMessage('Invalid match status'),
  query('userId').optional().isMongoId().withMessage('Invalid user ID'),
  ...paginationQuery,
];

const claimQueryValidator = [
  query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid claim status'),
  query('role').optional().isIn(['claimant', 'reporter']).withMessage('Invalid claim role filter'),
  ...paginationQuery,
];

const deleteAccountValidator = [
  body('password').optional().isString().isLength({ min: 1, max: 128 }).withMessage('Password is invalid'),
];

const adminUserQueryValidator = [
  query('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search is too long'),
  ...paginationQuery,
];

const feedbackQueryValidator = [
  query('category').optional().isIn(['general', 'bug_report', 'feature_request', 'complaint', 'praise']).withMessage('Invalid feedback category'),
  query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  query('status').optional().isIn(['pending', 'reviewed', 'resolved']).withMessage('Invalid feedback status'),
  ...paginationQuery,
];

const feedbackResponseValidator = [
  body('adminResponse').optional().trim().isLength({ max: 1000 }).withMessage('Response cannot exceed 1000 characters'),
  body('status').optional().isIn(['pending', 'reviewed', 'resolved']).withMessage('Invalid feedback status'),
];

export {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyEmailValidator,
  googleLoginValidator,
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
  itemIdParam,
  notificationQueryValidator,
  notificationPreferencesValidator,
  pushSubscriptionValidator,
  matchQueryValidator,
  claimQueryValidator,
  claimQuestionParams,
  deleteAccountValidator,
  adminUserQueryValidator,
  feedbackQueryValidator,
  feedbackResponseValidator,
  handoverCancellationValidator,
};
