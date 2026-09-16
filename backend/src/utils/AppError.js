/**
 * Standardized Application Error Class for E-Logistics Backend
 * Fixes DEBT-03 (Unified Error Handler Pattern)
 */
class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode || 500;
    this.code = code || 'INTERNAL_SERVER_ERROR';
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
