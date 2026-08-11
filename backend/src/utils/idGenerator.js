/**
 * Id Generator Utility for E-Logistics System
 */

/**
 * Generates a unique tracking code following standard format: ELG + 9 digits + VN
 * Example: ELG100293848VN
 */
const generateTrackingCode = () => {
  const randomNum = Math.floor(100000000 + Math.random() * 900000000); // 9-digit random number
  return `ELG${randomNum}VN`;
};

module.exports = {
  generateTrackingCode,
};
