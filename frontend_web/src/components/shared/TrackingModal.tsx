import React from 'react';
import { X, MapPin, Truck, FileText, Edit3, Trash2 } from 'lucide-react';
import type { Order } from '../../types/order.types';

interface TrackingModalProps {
  order: Order | null;
  isOpen?: boolean;
  onClose: () => void;
  onEditOrder?: (order: Order) => void;
  onCancelOrder?: (order: Order) => void;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({ order, onClose, onEditOrder, onCancelOrder }) => {
  if (!order) return null;

  const isEditable = ['CREATED', 'PENDING_VERIFICATION', 'READY_TO_PICK', 'PENDING'].includes(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const steps = [
    { key: 'CREATED', label: 'Khởi Tạo Đơn', desc: 'Đã xác nhận & lên lịch lấy' },
    { key: 'READY_TO_PICK', label: 'Sẵn Sàng Lấy', desc: 'Đơn hàng chờ tài xế qua lấy' },
    { key: 'PICKED', label: 'Đã Lấy Hàng', desc: 'Tài xế nhận hàng từ người gửi' },
    { key: 'IN_TRANSIT', label: 'Trung Chuyển', desc: 'Đang vận chuyển giữa các bưu cục' },
    { key: 'DELIVERED', label: 'Hoàn Thành', desc: 'Người nhận đã ký nhận POD' },
  ];

  const getStepStatusIndex = (status: string) => {
    switch (status) {
      case 'CREATED':
      case 'PENDING_VERIFICATION':
      case 'PENDING':
        return 0;
      case 'READY_TO_PICK': return 1;
      case 'PICKED': return 2;
      case 'IN_TRANSIT': return 3;
      case 'DELIVERED': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = getStepStatusIndex(order.status);
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black text-white">{order.trackingCode || order.trackingNumber}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  isCancelled
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}>
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">Khởi tạo lúc: {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Mới tạo'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cancelled Notice Banner */}
        {isCancelled && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            ⚠️ Đơn hàng này đã bị hủy. Không thể chỉnh sửa hoặc thực hiện các thao tác vận chuyển.
          </div>
        )}

        {/* Visual Timeline Bar */}
        {!isCancelled && (
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tiến Trình Vận Chuyển Realtime</h4>
            
            <div className="grid grid-cols-5 gap-1 relative">
              {steps.map((step, idx) => {
                const isDone = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-500/30 scale-110'
                          : isDone
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <div>
                      <div className={`text-[11px] font-bold ${isDone ? 'text-white' : 'text-slate-500'}`}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Origin to Destination Route Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sender */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Nơi Gửi ({order.pickupAddress?.province || order.originCity || 'TP.HCM'})
            </div>
            <div className="text-sm font-bold text-white">{order.pickupAddress?.fullName || 'Người gửi'}</div>
            <div className="text-xs text-slate-400">{order.pickupAddress?.address}, {order.pickupAddress?.district}</div>
            <div className="text-xs text-slate-500 font-mono">SĐT: {order.pickupAddress?.phone}</div>
          </div>

          {/* Receiver */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Nơi Nhận ({order.deliveryAddress?.province || order.destinationCity || 'Hà Nội'})
            </div>
            <div className="text-sm font-bold text-white">{order.deliveryAddress?.fullName || order.recipientName}</div>
            <div className="text-xs text-slate-400">{order.deliveryAddress?.address || order.recipientAddress}, {order.deliveryAddress?.district}</div>
            <div className="text-xs text-slate-500 font-mono">SĐT: {order.deliveryAddress?.phone}</div>
          </div>
        </div>

        {/* Specifications */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">TL Thực</span>
            <strong className="text-white text-sm">{order.actualWeight || order.weightKg || 0} kg</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">TL Tính Cước</span>
            <strong className="text-cyan-400 text-sm">{order.chargeableWeight || order.chargeableWeightKg || 0} kg</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Kích Thước (DxRxC)</span>
            <strong className="text-white font-mono text-sm">{order.dimensions?.length || 0}x{order.dimensions?.width || 0}x{order.dimensions?.height || 0} cm</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Tổng Cước Phí</span>
            <strong className="text-emerald-400 text-sm font-mono">{formatCurrency(order.shippingFee || order.cost || 0)}</strong>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {!isCancelled && isEditable && onCancelOrder && (
              <button
                onClick={() => onCancelOrder(order)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hủy Đơn Hàng
              </button>
            )}

            {!isCancelled && isEditable && onEditOrder && (
              <button
                onClick={() => onEditOrder(order)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Chỉnh Sửa Thông Tin
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => alert(`Đã tải Vận Đơn Điện Tử ${order.trackingCode || order.trackingNumber}.pdf`)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              In Vận Đơn PDF
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

