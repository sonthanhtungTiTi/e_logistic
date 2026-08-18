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
};
