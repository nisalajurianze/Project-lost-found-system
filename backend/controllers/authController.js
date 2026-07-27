import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendEmail } from '../services/emailService.js';
import { createNotification } from '../services/notificationService.js';
import { randomToken, hashToken } from '../utils/security.js';
import { clearAuthCookies } from '../utils/cookies.js';
import { createSession, rotateSession, revokeSession, revokeAllUserSessions } from '../services/sessionService.js';
import { clientOrigins } from '../config/security.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || undefined);
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const clientUrl = () => clientOrigins[0] || 'http://localhost:5173';

const runSideEffects = async (...operations) => {
  const results = await Promise.allSettled(operations.filter(Boolean));
  return results.every((result) => result.status === 'fulfilled' && result.value !== false);
};

const createUserOrConflict = async (payload) => {
  try {
    return await User.create(payload);
  } catch (error) {
    if (error?.code === 11000) throw ApiError.conflict('Email or student ID is already registered.');
    throw error;
  }
};

const register = asyncHandler(async (req, res) => {
  const registrationSetting = await SystemSetting.findOne({ key: 'allow_registration' }).lean();
  if (registrationSetting?.value === false) throw ApiError.forbidden('New registrations are temporarily disabled.');
  const email = normalizeEmail(req.body.email);
  const studentId = String(req.body.studentId || '').trim().toUpperCase();
  const duplicateFilters = [{ email }];
  if (studentId) duplicateFilters.push({ studentId });
  const existingUser = await User.findOne({ $or: duplicateFilters });
  if (existingUser) throw ApiError.conflict('Email or student ID is already registered.');

  const setting = await SystemSetting.findOne({ key: 'require_email_verification' }).lean();
  const requireVerification = setting ? setting.value !== false : true;
  const verificationToken = requireVerification ? randomToken(32) : null;
  const user = await createUserOrConflict({
    fullName: req.body.fullName,
    email,
    phone: req.body.phone || '',
    studentId: studentId || undefined,
    password: req.body.password,
    isVerified: !requireVerification,
    verificationTokenHash: verificationToken ? hashToken(verificationToken) : undefined,
    verificationTokenExpire: verificationToken ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
  });

  if (requireVerification) {
    const delivered = await runSideEffects(sendEmail({
      to: user.email,
      template: 'verification',
      data: { name: user.fullName, url: `${clientUrl()}/verify-email#token=${encodeURIComponent(verificationToken)}` },
      idempotencyKey: `registration-verification-${user._id}`,
    }));
    await runSideEffects(createNotification({
      userId: user._id,
      title: 'Welcome to Smart Lost & Found!',
      message: 'Verify your email to activate all features.',
      type: 'welcome',
      dedupeKey: `registration-welcome-${user._id}`,
    }));
    return ApiResponse.created(
      { user, emailDeliveryPending: !delivered },
      delivered
        ? 'Registration successful. Check your email for the verification link.'
        : 'Registration successful. Email delivery is pending; request a new verification email later.',
    ).send(res);
  }

  await createSession(user, req, res, { rememberMe: false });
  await runSideEffects(createNotification({
    userId: user._id,
    title: 'Welcome to Smart Lost & Found!',
    message: 'Your account has been created.',
    type: 'welcome',
    dedupeKey: `registration-welcome-${user._id}`,
  }));
  return ApiResponse.created({ user }, 'Registration successful.').send(res);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const token = String(req.body.token || '');
  if (!token) throw ApiError.badRequest('Verification token is required.');
  const user = await User.findOne({
    verificationTokenHash: hashToken(token),
    verificationTokenExpire: { $gt: new Date() },
  }).select('+verificationTokenHash +verificationTokenExpire');
  if (!user) throw ApiError.badRequest('Verification link is invalid or expired.');
  user.isVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationTokenExpire = undefined;
  await user.save({ validateBeforeSave: false });
  await runSideEffects(
    sendEmail({
      to: user.email,
      template: 'welcome',
      data: { name: user.fullName },
      idempotencyKey: `verified-welcome-${user._id}`,
    }),
    createNotification({
      userId: user._id,
      title: 'Account verified',
      message: 'Your email was verified successfully.',
      type: 'system',
      dedupeKey: `account-verified-${user._id}`,
    }),
  );
  return ApiResponse.ok(null, 'Email verified successfully.').send(res);
});

const login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!user) {
    await bcrypt.compare(password, '$2b$12$qDgQZx3e5MtWz/rF7Y1ZouMv/5PtxR9g6NqxZ2rt6Tq6Z.2wGr4oG');
    throw ApiError.unauthorized('Invalid email or password.');
  }
  if (user.isLocked) throw ApiError.tooManyRequests('Account is temporarily locked. Try again later.');
  if (!(await user.comparePassword(password))) {
    const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    await User.updateOne(
      { _id: user._id },
      [
        { $set: { loginAttempts: { $add: [{ $ifNull: ['$loginAttempts', 0] }, 1] } } },
        { $set: { lockUntil: { $cond: [{ $gte: ['$loginAttempts', 5] }, lockUntil, '$lockUntil'] } } },
      ],
    );
    throw ApiError.unauthorized('Invalid email or password.');
  }
  if (!user.isActive || user.deletedAt) throw ApiError.forbidden('Account is unavailable.');
  const setting = await SystemSetting.findOne({ key: 'require_email_verification' }).lean();
  if ((setting ? setting.value !== false : true) && !user.isVerified) throw ApiError.forbidden('Verify your email before logging in.');
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  await User.updateOne(
    { _id: user._id },
    { $set: { loginAttempts: 0, lastLogin: user.lastLogin }, $unset: { lockUntil: 1 } },
  );
  await createSession(user, req, res, { rememberMe: Boolean(req.body.rememberMe) });
  return ApiResponse.ok({ user }, 'Login successful.').send(res);
});

const googleLogin = asyncHandler(async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) throw new ApiError(503, 'Google sign-in is not configured.');
  const ticket = await googleClient.verifyIdToken({ idToken: req.body.idToken, audience: process.env.GOOGLE_CLIENT_ID }).catch(() => null);
  const payload = ticket?.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) throw ApiError.unauthorized('Google identity could not be verified.');
  const email = normalizeEmail(payload.email);
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] }).select('+googleId +password');
  if (!user) {
    try {
      user = await User.create({
        fullName: payload.name || email.split('@')[0], email, googleId: payload.sub,
        authProvider: 'google', isVerified: true, profileImage: { url: payload.picture || '', publicId: '' },
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      user = await User.findOne({ email }).select('+googleId +password');
      if (!user) throw ApiError.conflict('Google account could not be linked.');
    }
  }
  if (!user.isActive || user.deletedAt) throw ApiError.forbidden('Account is unavailable.');
  if (user.googleId && user.googleId !== payload.sub) {
    throw ApiError.conflict('This email is linked to another Google identity.');
  }
  if (user.googleId !== payload.sub || user.authProvider !== (user.password ? 'both' : 'google') || !user.isVerified) {
    user.googleId = payload.sub;
    user.authProvider = user.password ? 'both' : 'google';
    user.isVerified = true;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
  }
  await createSession(user, req, res, { rememberMe: true });
  return ApiResponse.ok({ user }, 'Google login successful.').send(res);
});

const refreshToken = asyncHandler(async (req, res) => {
  const user = await rotateSession(req.cookies?.refreshToken, req, res);
  return ApiResponse.ok({ user }, 'Session refreshed successfully.').send(res);
});

const logout = asyncHandler(async (req, res) => {
  await revokeSession(req.cookies?.refreshToken);
  clearAuthCookies(res);
  return ApiResponse.ok(null, 'Logged out successfully.').send(res);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: normalizeEmail(req.body.email), isActive: true });
  if (user) {
    const rawToken = randomToken(32);
    user.resetPasswordTokenHash = hashToken(rawToken);
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await runSideEffects(sendEmail({
      to: user.email,
      template: 'passwordReset',
      data: { name: user.fullName, url: `${clientUrl()}/reset-password#token=${encodeURIComponent(rawToken)}` },
      idempotencyKey: `password-reset-${user._id}-${user.resetPasswordExpire.getTime()}`,
    }));
  }
  return ApiResponse.ok(null, 'If the email exists, a password reset link will be sent.').send(res);
});

const resetPassword = asyncHandler(async (req, res) => {
  const token = String(req.body.token || '');
  if (!token) throw ApiError.badRequest('Reset token is required.');
  const user = await User.findOne({
    resetPasswordTokenHash: hashToken(token),
    resetPasswordExpire: { $gt: new Date() },
  }).select('+resetPasswordTokenHash +resetPasswordExpire +googleId');
  if (!user) throw ApiError.badRequest('Reset link is invalid or expired.');
  user.password = req.body.password;
  user.authProvider = user.googleId ? 'both' : 'local';
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  await revokeAllUserSessions(user._id);
  clearAuthCookies(res);
  return ApiResponse.ok(null, 'Password reset successful. Sign in again.').send(res);
});


const resendVerification = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email, isActive: true, deletedAt: null }).select('+verificationTokenHash +verificationTokenExpire');
  if (user && !user.isVerified) {
    const rawToken = randomToken(32);
    user.verificationTokenHash = hashToken(rawToken);
    user.verificationTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    await runSideEffects(sendEmail({
      to: user.email,
      template: 'verification',
      data: { name: user.fullName, url: `${clientUrl()}/verify-email#token=${encodeURIComponent(rawToken)}` },
      idempotencyKey: `verification-resend-${user._id}-${user.verificationTokenExpire.getTime()}`,
    }));
  }
  return ApiResponse.ok(null, 'If an unverified account exists, a new verification email will be sent.').send(res);
});

const getMe = asyncHandler(async (req, res) => ApiResponse.ok(req.user, 'Current user retrieved successfully.').send(res));

export { register, verifyEmail, resendVerification, login, googleLogin, refreshToken, logout, forgotPassword, resetPassword, getMe };
