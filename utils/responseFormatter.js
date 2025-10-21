/**
 * Format successful API response
 * @param {Object} data - Response data
 * @returns {Object} Formatted response
 */
function successResponse(data) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format error API response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
function errorResponse(message, statusCode = 500) {
  return {
    success: false,
    error: {
      message,
      statusCode
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  successResponse,
  errorResponse
};