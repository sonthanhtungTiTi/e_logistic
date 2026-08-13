/**
 * Telematics Service (Redis & In-Memory Fallback for Driver Live GPS Tracking)
 * Stores driver real-time coordinates (TTL: 30 minutes)
 */

const driverLocationsCache = new Map();

/**
 * Cập nhật vị trí GPS siêu tốc cho Tài xế
 */
const updateDriverLocation = async (driverId, lat, lng) => {
  const payload = {
    lat: Number(lat),
    lng: Number(lng),
    updatedAt: Date.now()
  };
  driverLocationsCache.set(String(driverId), payload);
  return payload;
};

/**
 * Lấy vị trí GPS mới nhất của Tài xế
 */
const getDriverLocation = async (driverId) => {
  if (!driverId) return null;
  const key = String(driverId);
  const data = driverLocationsCache.get(key);
  if (!data) return null;

  // TTL Check: 30 phút (1800000 ms)
  if (Date.now() - data.updatedAt > 1800000) {
    driverLocationsCache.delete(key);
    return null;
  }
  return data;
};

module.exports = {
  updateDriverLocation,
  getDriverLocation
};
