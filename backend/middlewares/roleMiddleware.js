// ============================================
// Role-Based Access Control Middleware
// Restrict routes to specific user roles
// ============================================

import ApiError from '../utils/apiError.js';

/**
 * Restrict access to users with one of the specified roles.
 *
 * @param  {...string} roles - Allowed roles (e.g. 'admin', 'user')
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/admin-only', protect, authorize('admin'), handler);
 * router.get('/both', protect, authorize('admin', 'user'), handler);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated. Please log in.');
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Role '${req.user.role}' is not authorised to access this resource.`
      );
    }

    next();
  };
};

export default authorize;
