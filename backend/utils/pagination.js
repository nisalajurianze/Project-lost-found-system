// ============================================
// Pagination Utility
// Standardised cursor & offset pagination helpers
// ============================================

/**
 * Parse pagination query parameters and return skip/limit values
 * plus metadata for the response.
 *
 * @param {object} query       - Express req.query
 * @param {number} totalDocs   - Total document count (from countDocuments)
 * @returns {{
 *   page: number,
 *   limit: number,
 *   skip: number,
 *   totalPages: number,
 *   totalDocs: number,
 *   hasNextPage: boolean,
 *   hasPrevPage: boolean,
 * }}
 */
const paginate = (query, totalDocs) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const totalPages = Math.ceil(totalDocs / limit) || 1;

  return {
    page,
    limit,
    skip,
    totalPages,
    totalDocs,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Build a sort object from query string.
 * Accepts: "field" (asc), "-field" (desc), "field1,-field2"
 *
 * @param {string} sortString - Comma-separated sort fields
 * @param {object} allowedFields - Map of allowed field names (keys)
 * @param {object} defaultSort - Fallback sort
 * @returns {object} Mongoose-compatible sort object
 */
const buildSort = (
  sortString,
  allowedFields = { createdAt: 1, updatedAt: 1 },
  defaultSort = { createdAt: -1 }
) => {
  if (!sortString) return defaultSort;

  const sort = {};
  const fields = sortString.split(',');

  for (const field of fields) {
    const trimmed = field.trim();
    if (!trimmed) continue;

    const isDesc = trimmed.startsWith('-');
    const fieldName = isDesc ? trimmed.slice(1) : trimmed;

    // Only allow whitelisted fields to prevent NoSQL injection in sort
    if (fieldName in allowedFields) {
      sort[fieldName] = isDesc ? -1 : 1;
    }
  }

  return Object.keys(sort).length > 0 ? sort : defaultSort;
};

export { paginate, buildSort };
