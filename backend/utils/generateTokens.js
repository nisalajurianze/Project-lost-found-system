// ============================================
// Token Generation Utility
// Generate access + refresh tokens and set cookies
// ============================================

/**
 * Generate access & refresh tokens for a user, persist the
 * refresh token in the database, and set both as HTTP-only cookies.
 *
 * @param {import('mongoose').Document} user - Mongoose user document
 * @param {import('express').Response}  res  - Express response object
 * @param {boolean} rememberMe - Whether to persist the refresh token cookie
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 */
const generateTokens = async (user, res, rememberMe = false) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Persist refresh token in user document
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Cookie options
  const accessCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  };

  const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth/refresh-token', // Only sent on refresh endpoint
  };

  if (rememberMe) {
    refreshCookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  // Set cookies
  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  return { accessToken, refreshToken };
};

export default generateTokens;
