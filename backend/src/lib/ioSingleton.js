/**
 * io Singleton — để các service có thể emit event mà không cần truyền io xuống qua từng lớp.
 * Được set 1 lần duy nhất từ server.js.
 */
let _io = null;

module.exports = {
  setIo: (io) => { _io = io; },
  getIo: () => _io,
  // Emit `inventory:update` đến room của 1 hub
  emitInventoryUpdate: (hubId, payload) => {
    if (!_io || !hubId) return;
    try {
      _io.to(`warehouse-dashboard:${hubId.toString()}`).emit('inventory:update', payload);
    } catch (e) {
      console.error('[IO_EMIT_ERROR]', e.message);
    }
  },
  // Emit realtime updates khi trạng thái đơn hàng thay đổi
  emitOrderUpdate: (sellerId, orderData) => {
    if (!_io) return;
    try {
      const payload = {
        trackingCode: orderData.trackingCode,
        status: orderData.status,
        sellerId: orderData.sellerId,
        updatedAt: orderData.updatedAt || new Date().toISOString(),
        order: orderData
      };
      _io.emit('order:updated', payload);
      if (sellerId) {
        _io.to(`seller:${sellerId.toString()}`).emit('order:updated', payload);
      }
    } catch (e) {
      console.error('[IO_ORDER_EMIT_ERROR]', e.message);
    }
  },
  // Emit realtime notification cho Admin khi có hồ sơ KYC mới hoặc thay đổi trạng thái duyệt
  emitKycUpdate: (payload) => {
    if (!_io) return;
    try {
      _io.emit('kyc:update', payload);
      if (payload && payload.sellerId) {
        _io.to(`seller:${payload.sellerId.toString()}`).emit('kyc:status_updated', payload);
        _io.emit(`seller:${payload.sellerId.toString()}:kyc`, payload);
      }
    } catch (e) {
      console.error('[IO_KYC_EMIT_ERROR]', e.message);
    }
  },
  // Emit realtime updates cho Shipper (Hủy đơn, Bù đơn, Gán đơn)
  emitShipperUpdate: (shipperId, event, payload) => {
    if (!_io) return;
    try {
      _io.emit(event, payload);
      if (shipperId) {
        _io.to(`shipper:${shipperId.toString()}`).emit(event, payload);
        _io.to(`shipper_${shipperId.toString()}`).emit(event, payload);
      }
    } catch (e) {
      console.error('[IO_SHIPPER_EMIT_ERROR]', e.message);
    }
  }
};
