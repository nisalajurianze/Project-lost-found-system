// ============================================
// API Response Class
// Standardised success response wrapper
// ============================================

/**
 * Standardised API success response.
 * Every successful endpoint returns data in this format.
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 200, 201)
   * @param {any}    data       - Response payload
   * @param {string} message    - Human-readable success message
   */
  constructor(statusCode, data, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  /**
   * Send this response via Express res object.
   * @param {import('express').Response} res
   * @returns {import('express').Response}
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }

  // ── Static factory helpers ──────────────────────────────────────────

  static ok(data, message = 'Success') {
    return new ApiResponse(200, data, message);
  }

  static created(data, message = 'Created successfully') {
    return new ApiResponse(201, data, message);
  }

  static noContent(message = 'Deleted successfully') {
    return new ApiResponse(200, null, message);
  }
}

export default ApiResponse;
