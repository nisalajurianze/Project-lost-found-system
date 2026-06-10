// ============================================
// API Error Class
// Custom error with HTTP status codes
// ============================================

/**
 * Custom error class for API responses.
 * Extends the native Error with an HTTP status code, structured
 * error array, and operational flag for safe error reporting.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 404, 500)
   * @param {string} message    - Human-readable error message
   * @param {Array}  errors     - Optional array of detailed error objects
   * @param {string} stack      - Optional pre-built stack trace
   */
  constructor(statusCode, message = 'Something went wrong', errors = [], stack = '') {
    super(message);

    this.statusCode = statusCode;
    this.success = false;
    this.message = message;
    this.errors = errors;
    this.data = null;

    // Operational errors are expected (bad input, auth failure, etc.)
    // vs programming errors which should crash the process
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 400 Bad Request
   */
  static badRequest(message = 'Bad request', errors = []) {
    return new ApiError(400, message, errors);
  }

  /**
   * 401 Unauthorized
   */
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  /**
   * 403 Forbidden
   */
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  /**
   * 404 Not Found
   */
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  /**
   * 409 Conflict
   */
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  /**
   * 429 Too Many Requests
   */
  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new ApiError(429, message);
  }

  /**
   * 500 Internal Server Error
   */
  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}

export default ApiError;
