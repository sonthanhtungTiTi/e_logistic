const Order = require('../models/order.model');

/**
 * Real-time GPS WebSocket Gateway using Room Pattern
 * Prevents broadcasting GPS data globally to avoid server CPU/memory overload.
 */
const initTrackingGateway = (io) => {
  io.on('connection', (socket) => {
    // 1. Buyers join private tracking room for their specific tracking number
    socket.on('join_order_tracking', (trackingNumber) => {
      if (!trackingNumber) return;
      const cleanCode = String(trackingNumber).trim().toUpperCase();
      const roomName = `room_order_${cleanCode}`;
      socket.join(roomName);
    });

    // 2. Driver / Shipper App emits GPS coordinates updates
    socket.on('update_driver_location', async (data) => {
      try {
        const { trackingNumber, lat, lng, etaMinutes } = data;
        if (!trackingNumber || lat === undefined || lng === undefined) return;

        const cleanCode = String(trackingNumber).trim().toUpperCase();
        const updatedAt = new Date();

        // Atomic DB Update
        await Order.updateOne(
          { trackingCode: cleanCode },
          {
            $set: {
              'driverLastLocation.lat': Number(lat),
              'driverLastLocation.lng': Number(lng),
              'driverLastLocation.updatedAt': updatedAt,
              calculatedEta: etaMinutes !== undefined ? Number(etaMinutes) : 12
            }
          }
        );

        // Targeted Emit strictly to room_order_<trackingNumber>
        io.to(`room_order_${cleanCode}`).emit('gps_updated', {
          lat: Number(lat),
          lng: Number(lng),
          eta_minutes: etaMinutes !== undefined ? Number(etaMinutes) : 12,
          is_gps_stale: false,
          updated_at: updatedAt
        });

      } catch (err) {
        console.error('❌ Lỗi cập nhật vị trí tài xế qua WebSocket:', err.message);
      }
    });

    socket.on('disconnect', () => {
      // Clean up connection quietly
    });
  });
};

module.exports = { initTrackingGateway };
