import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RefreshSession from '../models/RefreshSession.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { accessSecret, allowBearerAuth } from '../config/security.js';

const tokenFromRequest = (req) => {
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  if (allowBearerAuth && req.headers.authorization?.startsWith('Bearer ')) return req.headers.authorization.slice(7);
  return null;
};

export const verifySessionFamily = async (userId, familyId) => {
  if (typeof familyId !== 'string' || !familyId || familyId.length > 128) {
    throw ApiError.unauthorized('Access session is invalid.');
  }
  const now = new Date();
  const [user, activeSession] = await Promise.all([
    User.findById(userId),
    RefreshSession.exists({
      userId,
      familyId,
      revokedAt: null,
      compromisedAt: null,
      expiresAt: { $gt: now },
      $or: [{ familyExpiresAt: { $gt: now } }, { familyExpiresAt: { $exists: false } }],
    }),
  ]);
  if (!user || !user.isActive || user.deletedAt) throw ApiError.forbidden('Account is unavailable.');
  if (!activeSession) throw ApiError.unauthorized('Access session is no longer active.');
  return { user, familyId };
};

const loadUser = async (token) => {
  const decoded = jwt.verify(token, accessSecret, { algorithms: ['HS256'], issuer: 'smart-lf' });
  return verifySessionFamily(decoded.sub, decoded.sid);
};

export const verifyAccessSession = loadUser;

const protect = asyncHandler(async (req, _res, next) => {
  const token = tokenFromRequest(req);
  if (!token) throw ApiError.unauthorized('Not authenticated. Please log in.');
  try {
    const authenticated = await loadUser(token);
    req.user = authenticated.user;
    req.sessionFamilyId = authenticated.familyId;
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
  try {
    const authenticated = await loadUser(token);
    req.user = authenticated.user;
    req.sessionFamilyId = authenticated.familyId;
  } catch { /* anonymous response */ }
  return next();
});

export { protect, optionalAuth };
