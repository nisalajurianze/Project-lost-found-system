import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import RefreshSession from '../models/RefreshSession.js';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import { randomToken, hashToken } from '../utils/security.js';
import { accessCookieOptions, refreshCookieOptions } from '../utils/cookies.js';
import { accessSecret, accessExpire, refreshDays } from '../config/security.js';

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
  const days = rememberMe ? Math.min(30, refreshDays) : refreshDays;
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
  const dbSession = await mongoose.startSession();
  let user;
  let newRaw;
  let remainingDays;
  let terminalError;

  try {
    await dbSession.withTransaction(async () => {
      const current = await RefreshSession.findOneAndUpdate(
        { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
        { $set: { revokedAt: now } },
        { new: false, session: dbSession },
      ).select('+tokenHash +replacedByHash');

      if (!current) {
        const reused = await RefreshSession.findOne({ tokenHash }).select('+tokenHash').session(dbSession);
        if (reused) {
          await RefreshSession.updateMany(
            { familyId: reused.familyId, revokedAt: null },
            { $set: { revokedAt: now } },
            { session: dbSession },
          );
        }
        terminalError = ApiError.unauthorized('Refresh session is invalid or has already been used.');
        return;
      }

      user = await User.findById(current.userId).session(dbSession);
      if (!user || !user.isActive || user.deletedAt) {
        await RefreshSession.updateMany(
          { familyId: current.familyId, revokedAt: null },
          { $set: { revokedAt: now } },
          { session: dbSession },
        );
        terminalError = ApiError.forbidden('Account is unavailable.');
        return;
      }

      newRaw = randomToken(48);
      const newHash = hashToken(newRaw);
      remainingDays = Math.max(1, Math.ceil((current.expiresAt.getTime() - Date.now()) / 86_400_000));
      current.replacedByHash = newHash;
      await current.save({ session: dbSession, validateBeforeSave: false });
      await RefreshSession.create([{
        userId: user._id,
        tokenHash: newHash,
        familyId: current.familyId,
        expiresAt: new Date(Date.now() + remainingDays * 86_400_000),
        ...sessionMetadata(req),
      }], { session: dbSession });
    });
  } finally {
    await dbSession.endSession();
  }

  if (terminalError) throw terminalError;
  setCookies(res, user, newRaw, remainingDays);
  return user;
};

export const revokeSession = async (rawRefresh) => {
  if (!rawRefresh) return;
  await RefreshSession.updateOne({ tokenHash: hashToken(rawRefresh), revokedAt: null }, { $set: { revokedAt: new Date() } });
};

export const revokeAllUserSessions = async (userId) => {
  await RefreshSession.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
};
