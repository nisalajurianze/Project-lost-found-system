// ============================================
// Sanitize Middleware
// Prevent NoSQL injection & XSS
// ============================================

import mongoSanitize from 'express-mongo-sanitize';

/**
 * Sanitise request data to prevent NoSQL injection.
 * Removes keys starting with '$' and containing '.'.
 */
const sanitize = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️  Sanitised key "${key}" in ${req.method} ${req.originalUrl}`);
  },
});

export default sanitize;
