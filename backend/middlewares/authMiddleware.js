// ============================================
// Authentication Middleware
// JWT access token verification via cookie or header
// ============================================

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Protect routes – verifies JWT access token.
 * Token sources (checked in order):
 *   1. HTTP-only cookie "accessToken"
 *   2. Authorization header "Bearer <token>"
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check cookie first
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  // 2. Fallback to Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Not authenticated. Please log in.');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Fetch user (exclude password but include isActive check)
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists.');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated. Contact admin.');
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired. Please refresh your token.');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid access token.');
    }
    throw error;
  }
});

/**
 * Optional auth – attaches user if valid token present, but doesn't block.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch {
      // Silently ignore — user just won't be attached
    }
  }

  next();
});

export { protect, optionalAuth };
