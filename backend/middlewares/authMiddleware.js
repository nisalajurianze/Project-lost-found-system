import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { accessSecret, allowBearerAuth } from '../config/security.js';

const tokenFromRequest = (req) => {
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  if (allowBearerAuth && req.headers.authorization?.startsWith('Bearer ')) return req.headers.authorization.slice(7);
  return null;
};

const loadUser = async (token) => {
  const decoded = jwt.verify(token, accessSecret, { algorithms: ['HS256'], issuer: 'smart-lf' });
  const user = await User.findById(decoded.sub);
  if (!user || !user.isActive || user.deletedAt) throw ApiError.forbidden('Account is unavailable.');
  return user;
};

const protect = asyncHandler(async (req, _res, next) => {
  const token = tokenFromRequest(req);
  if (!token) throw ApiError.unauthorized('Not authenticated. Please log in.');
  try {
    req.user = await loadUser(token);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw ApiError.unauthorized('Access token expired.');
    if (error.name === 'JsonWebTokenError') throw ApiError.unauthorized('Invalid access token.');
    throw error;
  }
});

const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = tokenFromRequest(req);
  if (!token) return next();
  try { req.user = await loadUser(token); } catch { /* anonymous response */ }
  return next();
});

export { protect, optionalAuth };
