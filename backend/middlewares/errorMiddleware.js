// ============================================
// Error Handling Middleware
// Centralised error handler with specific error types
// ============================================

import ApiError from '../utils/apiError.js';

/**
 * 404 Not Found handler – catches requests to undefined routes.
 */
const notFound = (req, res, next) => {
  const error = ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware.
 * Normalises Mongoose, JWT, Multer, and other errors into ApiError format.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log the full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ ERROR:', err);
  }

  // ── Mongoose: Bad ObjectId (CastError) ────────────────────────────
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new ApiError(400, message);
  }

  // ── Mongoose: Duplicate key (code 11000) ──────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    const message = `Duplicate value for field: ${field}. Please use a different value.`;
    error = new ApiError(409, message);
  }

  // ── Mongoose: Validation errors ───────────────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = new ApiError(400, 'Validation failed', messages);
  }

  // ── JWT: Token expired ────────────────────────────────────────────
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Token has expired. Please log in again.');
  }

  // ── JWT: Invalid token ────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid token. Please log in again.');
  }

  // ── JWT: Token not active yet ─────────────────────────────────────
  if (err.name === 'NotBeforeError') {
    error = new ApiError(401, 'Token is not active yet.');
  }

  // ── Multer: File too large ────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new ApiError(400, 'File is too large. Maximum size is 5 MB.');
  }

  // ── Multer: Too many files ────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new ApiError(400, 'Too many files uploaded.');
  }

  // ── Multer: Unexpected field ──────────────────────────────────────
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new ApiError(400, `Unexpected file field: ${err.field}`);
  }

  // ── Multer: Generic MulterError ───────────────────────────────────
  if (err.name === 'MulterError') {
    error = new ApiError(400, err.message);
  }

  // ── Syntax errors (malformed JSON body) ───────────────────────────
  if (err.type === 'entity.parse.failed') {
    error = new ApiError(400, 'Invalid JSON in request body.');
  }

  // Build response
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.message || 'Internal Server Error',
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(statusCode).json(response);
};

export { notFound, errorHandler };
