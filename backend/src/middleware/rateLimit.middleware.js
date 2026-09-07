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

/**
 * Rate Limiter for KYC Submission API
 * Limits each Seller to at most 3 submissions per 24-hour window
 */
const kycSubmitRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Max 3 submissions per 24 hours
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    return req.user?._id ? req.user._id.toString() : 'anonymous';
  },
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: 'KYC_RATE_LIMIT_EXCEEDED',
      message: 'Bạn đã nộp KYC quá số lần cho phép (tối đa 3 lần/ngày). Vui lòng thử lại sau 24 giờ.',
    });
  },
});

module.exports = {
  createOrderRateLimiter,
  trackingRateLimiter,
  kycSubmitRateLimiter,
};

