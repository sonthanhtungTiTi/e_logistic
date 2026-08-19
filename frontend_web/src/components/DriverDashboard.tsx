import React, { useState } from 'react';
import { Truck, CheckCircle, Navigation, Camera, Sparkles, Phone, MapPin } from 'lucide-react';
import type { Order, OrderStatus } from '../types/order.types';

interface DriverDashboardProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, note: string) => void;
  onOpenOrderDetails: (order: Order) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  orders,
  onUpdateOrderStatus,
  onOpenOrderDetails,
}) => {
  const [selectedDriver] = useState('Nguyễn Văn Hùng');
  const [podNote, setPodNote] = useState('');
  const [podModalOrder, setPodModalOrder] = useState<Order | null>(null);

  // Filter orders assigned to drivers or active
  const driverOrders = orders.filter((o) => o.status !== 'CANCELLED');

  const handleConfirmPod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podModalOrder) return;
    const targetId = podModalOrder._id || podModalOrder.id || '';
    onUpdateOrderStatus(targetId, 'DELIVERED', podNote || 'Đã giao thành công & nhận POD');
    setPodModalOrder(null);
    setPodNote('');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Driver Info Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-amber-500/20">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">{selectedDriver}</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Tài Xế Đang Đăng Nhập
              </span>
            </div>
            <p className="text-xs text-slate-400">Đội xe container lạnh XE-01 • Tuyến TP.HCM ➔ Cần Thơ / Đà Nẵng</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800 text-xs">
          <Navigation className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-slate-300 font-semibold">Tốc độ trung bình: 65 km/h</span>
        </div>
      </div>

      {/* Driver Package Task List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Nhiệm Vụ Vận Chuyển Được Giao ({driverOrders.length})
          </h3>
          <span className="text-xs text-slate-400">Cập nhật trạng thái tức thì đến khách hàng</span>
        </div>

        <div className="space-y-4">
          {driverOrders.map((ord) => {
            const orderId = ord._id || ord.id || '';
            const trackingCode = ord.trackingCode || ord.trackingNumber || '';
            const senderName = ord.pickupAddress?.fullName || ord.senderName || 'N/A';
            const senderAddress = ord.pickupAddress?.address || ord.senderAddress || 'N/A';
            const recipientName = ord.deliveryAddress?.fullName || ord.recipientName || 'N/A';
            const recipientAddress = ord.deliveryAddress?.address || ord.recipientAddress || 'N/A';
            const recipientPhone = ord.deliveryAddress?.phone || ord.recipientPhone || 'N/A';

            return (
              <div
                key={orderId}
                className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">
                      {trackingCode}
                    </span>
                    <span className="text-xs text-slate-400">{ord.serviceType || 'EXPRESS'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                        ord.status === 'DELIVERED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : ord.status === 'OUT_FOR_DELIVERY'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                </div>

                {/* Delivery addresses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Điểm Nhận Hàng</span>
                    <div className="font-bold text-white">{senderName}</div>
                    <div className="text-slate-400">{senderAddress}</div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Điểm Giao Hàng</span>
                    <div className="font-bold text-emerald-400">{recipientName}</div>
                    <div className="text-slate-400">{recipientAddress}</div>
                    <div className="font-mono text-blue-400 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{recipientPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons for driver */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => onOpenOrderDetails(ord)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Xem Bản Đồ & Vận Đơn
                  </button>

                  <div className="flex items-center gap-2">
                    {(ord.status === 'CREATED' || ord.status === 'CONFIRMED' || ord.status === 'READY_TO_PICK') && (
                      <button
                        onClick={() => onUpdateOrderStatus(orderId, 'PICKED', 'Tài xế đã lấy hàng')}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Xác Nhận Đã Nhận Đơn
                      </button>
                    )}

                    {(ord.status === 'PICKED' || ord.status === 'PICKED_UP') && (
                      <button
                        onClick={() => onUpdateOrderStatus(orderId, 'IN_TRANSIT', 'Bắt đầu vận chuyển tuyến cao tốc')}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Truck className="w-4 h-4" />
                        Bắt Đầu Vận Chuyển
                      </button>
                    )}

                    {ord.status === 'IN_TRANSIT' && (
                      <button
                        onClick={() => onUpdateOrderStatus(orderId, 'OUT_FOR_DELIVERY', 'Tài xế đang đến vị trí giao')}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <MapPin className="w-4 h-4" />
                        Bắt Đầu Phát Hàng
                      </button>
                    )}

                    {ord.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() => setPodModalOrder(ord)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Ký Nhận POD & Hoàn Thành
                      </button>
                    )}

                    {ord.status === 'DELIVERED' && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Đã Hoàn Thành Giao
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* POD Confirmation Modal */}
      {podModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md glass-panel rounded-3xl border border-slate-700 p-6 space-y-5 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              Xác Nhận Ký Nhận POD ({podModalOrder.trackingCode || podModalOrder.trackingNumber})
            </h3>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Người nhận: <strong className="text-white">{podModalOrder.deliveryAddress?.fullName || podModalOrder.recipientName}</strong></div>
              <div className="text-slate-400">Địa chỉ: <strong className="text-white">{podModalOrder.deliveryAddress?.address || podModalOrder.recipientAddress}</strong></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Ghi Chú Ký Nhận POD</label>
              <textarea
                rows={3}
                placeholder="VD: Đã bàn giao cho Dược sĩ Nguyễn Văn B, hàng nguyên vẹn tem seal..."
                value={podNote}
                onChange={(e) => setPodNote(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-xs"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPodModalOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmPod}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
              >
                Xác Nhận Đã Giao
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
