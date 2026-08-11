const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter for Order Creation API (UC-06 Exception Flow 3.2)
 * Prevents spamming order creation requests (Too Many Requests - HTTP 429)
 */
const createOrderRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 30, // Limit each IP to 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res /*, next, options */) => {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Thao tác quá nhanh, vui lòng thử lại sau ít phút'
    });
  }
});

/**
 * Rate Limiter for Public Buyer Tracking API (UC Public Buyer Tracking - Exception Flow 1.1)
 * Prevents automated bot crawling and brute-force tracking code guessing (Max 10 requests/min per IP)
 */
const trackingRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10, // Limit each IP to 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau 1 phút.'
    });
  }
});

module.exports = {
  createOrderRateLimiter,
  trackingRateLimiter
};
