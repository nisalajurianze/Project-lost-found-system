// ============================================
// Validation Middleware
// Runs express-validator results and returns errors
// ============================================

import { validationResult } from 'express-validator';
import ApiError from '../utils/apiError.js';

/**
 * Middleware that checks express-validator results.
 * If there are validation errors, throws a 400 ApiError with details.
 * Place this AFTER the validator chain arrays in the route definition.
 *
 * @example
 * router.post('/items', createLostItemValidator, validate, createLostItem);
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    throw new ApiError(400, 'Validation failed', extractedErrors);
  }

  next();
};

export default validate;
