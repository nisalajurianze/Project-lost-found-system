// ============================================
// Auth Controller
// Handles user authentication, token refresh, and password flows
// ============================================

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import generateTokens from '../utils/generateTokens.js';
import { OAuth2Client } from 'google-auth-library';
import { sendEmail } from '../services/emailService.js';
import { createNotification } from '../services/notificationService.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Register a new user.
 * Sends email verification token.
 */
const register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, studentId, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { studentId }] });
  if (existingUser) {
    if (existingUser.email.toLowerCase() === email.toLowerCase()) {
      throw ApiError.conflict('Email is already registered.');
    }
    throw ApiError.conflict('Student ID is already registered.');
  }

  // Check system setting for email verification requirement
  const emailVerifSetting = await SystemSetting.findOne({ key: 'require_email_verification' });
  const requireEmailVerification = emailVerifSetting ? emailVerifSetting.value : true;

  // Create verification token (only if required)
  const token = requireEmailVerification ? crypto.randomBytes(32).toString('hex') : undefined;
  const tokenExpire = requireEmailVerification ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;

  // Create user
  const user = await User.create({
    fullName,
    email,
    phone,
    studentId,
    password,
    isVerified: !requireEmailVerification,
    verificationToken: token,
    verificationTokenExpire: tokenExpire
  });

  if (requireEmailVerification) {
    // Send verification email
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    await sendEmail({
      to: user.email,
      template: 'verification',
      data: {
        name: user.fullName,
        verificationUrl
      }
    });

    // Create system notification
    await createNotification({
      userId: user._id,
      title: 'Welcome to Smart Lost & Found!',
      message: 'Please verify your email address to unlock all features.',
      type: 'welcome'
    });

    // Response without password/refresh token
    const userData = user.toObject();
    delete userData.password;
    delete userData.verificationToken;
    delete userData.verificationTokenExpire;

    return ApiResponse.created(userData, 'Registration successful. Please check your email to verify your account.').send(res);
  } else {
    // Verification is disabled, instantly log them in
    const { accessToken, refreshToken } = await generateTokens(user, res, false);
    
    // Setup refresh token cookie is already handled by generateTokens
    
    await createNotification({
      userId: user._id,
      title: 'Welcome to Smart Lost & Found!',
      message: 'Your account has been created successfully.',
      type: 'welcome'
    });
    
    const userData = user.toObject();
    delete userData.password;
    delete userData.verificationToken;
    delete userData.verificationTokenExpire;
    
    return ApiResponse.created({ token: accessToken, data: userData }, 'Registration successful.').send(res);
  }
});

/**
 * Verify user email via token.
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw ApiError.badRequest('Verification token is required.');
  }

  // Find user by token and verify it hasn't expired
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpire: { $gt: new Date() }
  }).select('+verificationToken +verificationTokenExpire');

  if (!user) {
    throw ApiError.badRequest('Invalid or expired verification token.');
  }

  // Update verification status
  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpire = undefined;
  await user.save();

  // Send welcome email
  await sendEmail({
    to: user.email,
    template: 'welcome',
    data: {
      name: user.fullName
    }
  });

  // Notify user
  await createNotification({
    userId: user._id,
    title: 'Account Verified!',
    message: 'Your email has been verified successfully. Welcome aboard!',
    type: 'system'
  });

  ApiResponse.ok(null, 'Email verified successfully.').send(res);
});

/**
 * User login.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;

  // Fetch user with password
  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
  
  // SEC-006: Timing-safe login check
  if (!user) {
    // Hash a dummy password to mitigate timing attacks
    await bcrypt.compare(password, '$2a$12$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhash');
    throw ApiError.unauthorized('Invalid email or password.');
  }

  // SEC-011: Account Lockout Check
  if (user.isLocked) {
    throw ApiError.forbidden('Account is temporarily locked due to multiple failed login attempts. Please try again later.');
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins
    }
    await user.save({ validateBeforeSave: false });
    throw ApiError.unauthorized('Invalid email or password.');
  }

  // Check if account active
  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact an admin.');
  }

  // SEC-012: Enforce email verification on login
  const emailVerifSetting = await SystemSetting.findOne({ key: 'require_email_verification' });
  const requireEmailVerification = emailVerifSetting ? emailVerifSetting.value : true;
  
  if (requireEmailVerification && !user.isVerified) {
    throw ApiError.forbidden('Please verify your email address before logging in.');
  }

  // Reset login attempts on success
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // Generate tokens and set cookies
  const tokens = await generateTokens(user, res, rememberMe);

  const userData = user.toObject();
  delete userData.password;

  ApiResponse.ok({ user: userData, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 'Login successful.').send(res);
});

/**
 * Google Sign-In or Sign-Up.
 */
const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw ApiError.badRequest('Google ID Token is required.');
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    throw ApiError.unauthorized('Invalid Google Token.');
  }

  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;

  // 1. Try to find by googleId first (most reliable identifier for Google Auth)
  let user = await User.findOne({ googleId }).select('+lockUntil +loginAttempts');

  // 2. If not found by googleId, try finding by email
  if (!user) {
    user = await User.findOne({ email }).select('+lockUntil +loginAttempts');
  }

  if (user) {
    // If user exists but is locked
    if (user.isLocked) {
      throw ApiError.forbidden('Account is temporarily locked.');
    }
    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact an admin.');
    }

    let isModified = false;

    // Link googleId if they signed up with local before, or update if missing
    if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = 'google';
      // Consider them verified since Google verified their email
      user.isVerified = true;
      isModified = true;
    }

    // If email changed in Google, update it in our DB
    if (user.email !== email) {
      user.email = email;
      isModified = true;
    }

    if (isModified) {
      await user.save({ validateBeforeSave: false });
    }
  } else {
    // Register new user
    user = await User.create({
      fullName: name,
      email,
      googleId,
      authProvider: 'google',
      isVerified: true, // Google verifies emails
      profileImage: { url: picture, publicId: '' },
    });
    
    // Notify user
    await createNotification({
      userId: user._id,
      title: 'Welcome to Smart Lost & Found!',
      message: 'You have successfully signed up with Google.',
      type: 'welcome'
    });
  }

  // Generate tokens
  const tokens = await generateTokens(user, res, true);
  
  const userData = user.toObject();
  delete userData.password;

  ApiResponse.ok({ user: userData, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 'Google Login successful.').send(res);
});

/**
 * Refresh JWT tokens.
 */
const refreshToken = asyncHandler(async (req, res) => {
  // Extract refresh token from cookie, body, or Authorization header (fallback for cross-site cookie blocking)
  let rToken = req.cookies?.refreshToken 
    || req.body?.refreshToken 
    || req.query?.refreshToken;

  if (!rToken) {
    throw ApiError.unauthorized('No refresh token provided.');
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }

  // Find user and match token
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== rToken) {
    throw ApiError.unauthorized('Invalid refresh token.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('User account deactivated.');
  }

  // Generate new tokens
  const tokens = await generateTokens(user, res);

  ApiResponse.ok({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 'Token refreshed successfully.').send(res);
});

/**
 * User logout.
 */
const logout = asyncHandler(async (req, res) => {
  // Clear cookies
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth/refresh-token'
  });

  // Nullify refresh token in database if user is logged in
  if (req.user) {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
  }

  ApiResponse.ok(null, 'Logged out successfully.').send(res);
});

/**
 * Request password reset token.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Return success message even if user not found to prevent user enumeration
    return ApiResponse.ok(null, 'If your email is registered, you will receive a password reset link.').send(res);
  }

  // Generate crypto token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const tokenExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = tokenExpire;
  await user.save({ validateBeforeSave: false });

  // Send email
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    template: 'passwordReset',
    data: {
      name: user.fullName,
      resetUrl
    }
  });

  ApiResponse.ok(null, 'Password reset link sent to email.').send(res);
});

/**
 * Reset password using reset token.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const { password } = req.body;

  if (!token) {
    throw ApiError.badRequest('Reset token is required.');
  }

  // Hash token to match saved version
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user by valid reset token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: new Date() }
  }).select('+resetPasswordToken +resetPasswordExpire');

  if (!user) {
    throw ApiError.badRequest('Invalid or expired password reset token.');
  }

  // Update password and clear reset fields
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.refreshToken = undefined; // Invalidate current logins
  await user.save();

  ApiResponse.ok(null, 'Password reset successful. Please login with your new password.').send(res);
});

/**
 * Get current user details.
 */
const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Not authenticated.');
  }
  ApiResponse.ok(req.user, 'Current user retrieved successfully.').send(res);
});

export {
  register,
  verifyEmail,
  login,
  googleLogin,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe
};
