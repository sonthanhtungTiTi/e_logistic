import React, { useState, useEffect } from 'react';
import { Package, X, MapPin, User, Edit3, Printer, CheckCircle2, Clock } from 'lucide-react';
import type { Order } from '../../types/order.types';
import { PrintWaybillModal } from './PrintWaybillModal';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onEdit?: (order: Order) => void;
  onReadyToPick?: (order: Order) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onEdit, onReadyToPick }) => {
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Đếm ngược 5 phút cho phép Hủy & Sửa đơn ở trạng thái READY_TO_PICK
  const readyToPickTime = (order as any).readyToPickAt || order.updatedAt;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (order.status !== 'READY_TO_PICK' || !readyToPickTime) return 300;
    const elapsed = Math.floor((Date.now() - new Date(readyToPickTime).getTime()) / 1000);
    return Math.max(0, 300 - elapsed);
  });

  useEffect(() => {
    if (order.status !== 'READY_TO_PICK' || !readyToPickTime) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(readyToPickTime).getTime()) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setSecondsRemaining(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [order.status, readyToPickTime]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isCancelled = order.status === 'CANCELLED';
  const isWithin5MinWindow = order.status === 'READY_TO_PICK' && secondsRemaining > 0;
  const isEditable = !isCancelled && (
    ['CREATED', 'PENDING_VERIFICATION', 'PENDING'].includes(order.status) ||
    isWithin5MinWindow
  );
  const canReadyToPick = !isCancelled && ['CREATED', 'PENDING_VERIFICATION', 'PENDING'].includes(order.status);

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl border border-slate-800 p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                Chi Tiết Đơn Hàng <span className="font-mono text-blue-400">{order.trackingCode || order.trackingNumber}</span>
              </h3>
              <p className="text-xs text-slate-400">Ngày tạo: {formatDate(order.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* READY_TO_PICK Countdown Banner */}
        {order.status === 'READY_TO_PICK' && (
          <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-lg ${
            secondsRemaining > 0 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                secondsRemaining > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white">Đơn hàng ở trạng thái Sẵn Sàng Lấy Hàng (Đang đếm ngược 5 phút)</p>
                <p className="text-[11px] text-slate-300">
                  {secondsRemaining > 0 ? (
                    <span>⏳ Bạn có <strong className="text-amber-400 font-mono font-bold text-sm px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">{formatCountdown(secondsRemaining)}</strong> để chỉnh sửa thông tin hoặc hủy đơn trước khi bưu tá ghé lấy.</span>
                  ) : (
                    <span className="text-rose-400 font-bold">🔒 Đã HẾT thời hạn 5 phút. Thông tin đơn hàng đã khóa hoàn toàn.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status & Basic Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-semibold">Trạng Thái Hiện Tại</span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase inline-block border ${
              order.status === 'CANCELLED'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : order.status === 'DELIVERED'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : order.status === 'CREATED'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            }`}>
              {order.status}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-semibold">Tổng Cước Phí</span>
            <span className="font-mono font-black text-emerald-400 text-sm">{formatCurrency(order.shippingFee)}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-semibold">Tiền COD Thu Hộ</span>
            <span className="font-mono font-black text-amber-400 text-sm">{formatCurrency(order.codAmount)}</span>
          </div>
        </div>

        {/* Sender & Receiver Address Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Sender / Pickup Address */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Địa Chỉ Lấy Hàng (Kho Seller)
            </div>
            <div className="text-xs space-y-1 text-slate-300">
              <p className="font-bold text-white">{order.pickupAddress?.fullName}</p>
              <p className="font-mono text-slate-400">{order.pickupAddress?.phone}</p>
              <p className="text-slate-400 leading-relaxed">
                {order.pickupAddress?.address}, {order.pickupAddress?.ward}, {order.pickupAddress?.district}, {order.pickupAddress?.province}
              </p>
            </div>
          </div>

          {/* Receiver / Delivery Address */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
              <User className="w-4 h-4 text-blue-400" /> Địa Chỉ Giao Hàng (Người Nhận)
            </div>
            <div className="text-xs space-y-1 text-slate-300">
              <p className="font-bold text-white">{order.deliveryAddress?.fullName}</p>
              <p className="font-mono text-slate-400">{order.deliveryAddress?.phone}</p>
              <p className="text-slate-400 leading-relaxed">
                {order.deliveryAddress?.address}, {order.deliveryAddress?.ward}, {order.deliveryAddress?.district}, {order.deliveryAddress?.province}
              </p>
            </div>
          </div>

        </div>

        {/* Package & Items Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" /> Danh Sách Hàng Hóa ({order.items?.length || 1} sản phẩm)
          </h4>
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Tên sản phẩm</th>
                  <th className="p-3 text-center">Số lượng</th>
                  <th className="p-3 text-right">Khối lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold text-white">{item.name}</td>
                      <td className="p-3 text-center font-mono">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">{item.weight} kg</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-3 text-center text-slate-500">Hàng hóa tiêu chuẩn</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Package Specifications & Pricing Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 block">Khối lượng thực:</span>
            <span className="font-mono font-bold text-white">{order.actualWeight || order.chargeableWeight} kg</span>
          </div>
          <div>
            <span className="text-slate-500 block">Khối lượng quy đổi:</span>
            <span className="font-mono font-bold text-white">{order.volumetricWeight || 0} kg</span>
          </div>
          <div>
            <span className="text-slate-500 block">Khối lượng tính phí:</span>
            <span className="font-mono font-bold text-blue-400">{order.chargeableWeight} kg</span>
          </div>
          <div>
            <span className="text-slate-500 block">Khai giá hàng hóa:</span>
            <span className="font-mono font-bold text-emerald-400">{formatCurrency(order.goodsValue)}</span>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <div>
            {isEditable && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(order);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4" /> Chỉnh Sửa Đơn Hàng {order.status === 'READY_TO_PICK' && secondsRemaining > 0 && `(${formatCountdown(secondsRemaining)})`}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canReadyToPick && onReadyToPick && (
              <button
                onClick={() => {
                  onClose();
                  onReadyToPick(order);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/30 transition"
                title="Xác nhận đóng gói xong để hệ thống đưa vào tuyến thu gom"
              >
                <CheckCircle2 className="w-4 h-4 text-cyan-200" /> Chuẩn Bị Xong
              </button>
            )}
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition"
            >
              <Printer className="w-4 h-4 text-blue-400" /> In Vận Đơn PDF
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-blue-600/30 transition"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>

      {showPrintModal && (
        <PrintWaybillModal order={order} onClose={() => setShowPrintModal(false)} />
      )}
    </div>
  );
};
