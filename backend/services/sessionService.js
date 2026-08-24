import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import RefreshSession from '../models/RefreshSession.js';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import { randomToken, hashToken } from '../utils/security.js';
import { accessCookieOptions, refreshCookieOptions } from '../utils/cookies.js';
import { accessSecret, accessExpire, refreshDays, rememberedRefreshDays, nonRememberedRefreshDays } from '../config/security.js';

const issueAccessToken = (user) => jwt.sign(
  { role: user.role, email: user.email },
  accessSecret,
  { subject: user._id.toString(), issuer: 'smart-lf', algorithm: 'HS256', expiresIn: accessExpire },
);

const sessionMetadata = (req) => ({
  userAgent: String(req.get('user-agent') || '').slice(0, 500),
  ipAddress: String(req.ip || req.socket?.remoteAddress || '').slice(0, 100),
});

const setCookies = (res, user, rawRefresh, days) => {
  res.cookie('accessToken', issueAccessToken(user), accessCookieOptions());
  res.cookie('refreshToken', rawRefresh, refreshCookieOptions(days));
};

export const createSession = async (user, req, res, { rememberMe = false, familyId = crypto.randomUUID() } = {}) => {
  const rawRefresh = randomToken(48);
  const days = rememberMe ? Math.min(90, Math.max(refreshDays, rememberedRefreshDays)) : Math.min(refreshDays, nonRememberedRefreshDays);
  await RefreshSession.create({
    userId: user._id,
    tokenHash: hashToken(rawRefresh),
    familyId,
    expiresAt: new Date(Date.now() + days * 86_400_000),
    ...sessionMetadata(req),
  });
  setCookies(res, user, rawRefresh, days);
};

export const rotateSession = async (rawRefresh, req, res) => {
  if (!rawRefresh) throw ApiError.unauthorized('Refresh session is missing.');
  const tokenHash = hashToken(rawRefresh);
  const now = new Date();

  const performRotation = async (session = null) => {
    const opts = session ? { new: false, session } : { new: false };
    const queryOpts = session ? { session } : {};

    const current = await RefreshSession.findOneAndUpdate(
      { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
      { $set: { revokedAt: now } },
      opts,
    ).select('+tokenHash +replacedByHash');

    if (!current) {
      const reused = await RefreshSession.findOne({ tokenHash }, null, queryOpts).select('+tokenHash');
      if (reused) {
        await RefreshSession.updateMany(
          { familyId: reused.familyId, revokedAt: null },
          { $set: { revokedAt: now } },
          queryOpts,
        );
      }
      throw ApiError.unauthorized('Refresh session is invalid or has already been used.');
    }

    const user = await User.findById(current.userId, null, queryOpts);
    if (!user || !user.isActive || user.deletedAt) {
      await RefreshSession.updateMany(
        { familyId: current.familyId, revokedAt: null },
        { $set: { revokedAt: now } },
        queryOpts,
      );
      throw ApiError.forbidden('Account is unavailable.');
    }

    const newRaw = randomToken(48);
    const newHash = hashToken(newRaw);
    const remainingDays = Math.max(1, Math.ceil((current.expiresAt.getTime() - Date.now()) / 86_400_000));
    current.replacedByHash = newHash;
    if (session) {
      await current.save({ session, validateBeforeSave: false });
    } else {
      await current.save({ validateBeforeSave: false });
    }
    await RefreshSession.create([{
      userId: user._id,
      tokenHash: newHash,
      familyId: current.familyId,
      expiresAt: new Date(Date.now() + remainingDays * 86_400_000),
      ...sessionMetadata(req),
    }], queryOpts);

    return { user, newRaw, remainingDays };
  };

  let result;
  let dbSession;
  try {
    dbSession = await mongoose.startSession();
    await dbSession.withTransaction(async () => {
      result = await performRotation(dbSession);
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    result = await performRotation(null);
  } finally {
    if (dbSession) {
      try { await dbSession.endSession(); } catch {
        // Ignored: cleanup error during session ending
      }
    }
  }

  setCookies(res, result.user, result.newRaw, result.remainingDays);
  return result.user;
};

export const revokeSession = async (rawRefresh) => {
  if (!rawRefresh) return;
  await RefreshSession.updateOne({ tokenHash: hashToken(rawRefresh), revokedAt: null }, { $set: { revokedAt: new Date() } });
};

export const revokeAllUserSessions = async (userId) => {
  await RefreshSession.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
};
