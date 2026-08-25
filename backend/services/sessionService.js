import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import RefreshSession from '../models/RefreshSession.js';
import User from '../models/User.js';
import ApiError from '../utils/apiError.js';
import { randomToken, hashToken } from '../utils/security.js';
import { accessCookieOptions, refreshCookieOptions } from '../utils/cookies.js';
import { disconnectSessionSockets, disconnectUserSockets } from '../config/socket.js';
import { accessSecret, accessExpire, refreshDays, rememberedRefreshDays, nonRememberedRefreshDays } from '../config/security.js';

const DAY_MS = 86_400_000;

export const issueAccessToken = (user, familyId) => {
  if (typeof familyId !== 'string' || !familyId || familyId.length > 128) {
    throw ApiError.internal('Cannot issue an access token without a valid session family.');
  }
  return jwt.sign(
    { role: user.role, email: user.email, sid: familyId },
    accessSecret,
    { subject: user._id.toString(), issuer: 'smart-lf', algorithm: 'HS256', expiresIn: accessExpire, jwtid: crypto.randomUUID() },
  );
};

const sessionMetadata = (req) => ({
  userAgent: String(req.get('user-agent') || '').slice(0, 500),
  ipAddress: String(req.ip || req.socket?.remoteAddress || '').slice(0, 100),
});

const setCookies = (res, user, rawRefresh, days, familyId) => {
  res.cookie('accessToken', issueAccessToken(user, familyId), accessCookieOptions());
  res.cookie('refreshToken', rawRefresh, refreshCookieOptions(days));
};

export const createSession = async (user, req, res, { rememberMe = false, familyId = crypto.randomUUID() } = {}) => {
  const rawRefresh = randomToken(48);
  const days = rememberMe ? Math.min(90, Math.max(refreshDays, rememberedRefreshDays)) : Math.min(refreshDays, nonRememberedRefreshDays);
  const familyExpiresAt = new Date(Date.now() + days * DAY_MS);
  await RefreshSession.create({
    userId: user._id,
    tokenHash: hashToken(rawRefresh),
    familyId,
    expiresAt: familyExpiresAt,
    familyExpiresAt,
    ...sessionMetadata(req),
  });
  setCookies(res, user, rawRefresh, days, familyId);
};

export const rotateSession = async (rawRefresh, req, res) => {
  if (!rawRefresh) throw ApiError.unauthorized('Refresh session is missing.');
  const tokenHash = hashToken(rawRefresh);
  const now = new Date();

  const performRotation = async (session) => {
    const queryOpts = { session };
    const current = await RefreshSession.findOneAndUpdate(
      {
        tokenHash, revokedAt: null, compromisedAt: null, expiresAt: { $gt: now },
        $or: [{ familyExpiresAt: { $gt: now } }, { familyExpiresAt: { $exists: false } }],
      },
      { $set: { revokedAt: now } },
      { new: false, session },
    ).select('+tokenHash +replacedByHash');

    if (!current) {
      const reused = await RefreshSession.findOne({ tokenHash }, null, queryOpts).select('+tokenHash');
      return {
        failure: ApiError.unauthorized('Refresh session is invalid or has already been used.'),
        compromiseFamilyId: reused?.familyId || null,
      };
    }

    const familyExpiresAt = new Date(current.familyExpiresAt || current.expiresAt);
    if (familyExpiresAt <= now) {
      await RefreshSession.updateMany(
        { familyId: current.familyId, revokedAt: null },
        { $set: { revokedAt: now } },
        queryOpts,
      );
      return { failure: ApiError.unauthorized('Refresh session has expired.'), disconnectFamilyId: current.familyId };
    }

    const user = await User.findById(current.userId, null, queryOpts);
    if (!user || !user.isActive || user.deletedAt) {
      await RefreshSession.updateMany(
        { familyId: current.familyId, revokedAt: null },
        { $set: { revokedAt: now } },
        queryOpts,
      );
      return { failure: ApiError.forbidden('Account is unavailable.'), disconnectFamilyId: current.familyId };
    }

    const newRaw = randomToken(48);
    const newHash = hashToken(newRaw);
    const remainingDays = Math.max(0, (familyExpiresAt.getTime() - Date.now()) / DAY_MS);
    await RefreshSession.updateOne({ _id: current._id }, { $set: { replacedByHash: newHash } }, queryOpts);
    await RefreshSession.create([{
      userId: user._id,
      tokenHash: newHash,
      familyId: current.familyId,
      expiresAt: familyExpiresAt,
      familyExpiresAt,
      ...sessionMetadata(req),
    }], queryOpts);

    return { user, newRaw, remainingDays, familyId: current.familyId };
  };

  let result;
  let dbSession;
  try {
    dbSession = await mongoose.startSession();
    result = await dbSession.withTransaction(() => performRotation(dbSession));
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.serviceUnavailable('Session refresh is temporarily unavailable. Sign in again later.');
  } finally {
    if (dbSession) {
      try { await dbSession.endSession(); } catch {
        // Ignored: cleanup error during session ending
      }
    }
  }

  if (result.compromiseFamilyId) {
    await RefreshSession.updateMany(
      { familyId: result.compromiseFamilyId },
      { $set: { revokedAt: now, compromisedAt: now } },
    );
    await disconnectSessionSockets(result.compromiseFamilyId);
  } else if (result.disconnectFamilyId) {
    await disconnectSessionSockets(result.disconnectFamilyId);
  }
  if (result.failure) throw result.failure;

  setCookies(res, result.user, result.newRaw, result.remainingDays, result.familyId);
  return result.user;
};

export const revokeSession = async (rawRefresh) => {
  if (!rawRefresh) return;
  const session = await RefreshSession.findOne({ tokenHash: hashToken(rawRefresh) }).select('+tokenHash');
  if (!session) return;
  await RefreshSession.updateMany(
    { familyId: session.familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  await disconnectSessionSockets(session.familyId);
};

export const revokeAllUserSessions = async (userId, { session = null, disconnect = true } = {}) => {
  await RefreshSession.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    session ? { session } : {},
  );
  if (disconnect && !session) await disconnectUserSockets(userId);
};

export const disconnectRevokedUserSessions = (userId) => disconnectUserSockets(userId);
