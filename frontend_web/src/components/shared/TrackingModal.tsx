import React, { useState, useEffect } from 'react';
import { X, MapPin, Truck, Edit3, Trash2, Printer, CheckCircle2, Loader2, Clock } from 'lucide-react';
import type { Order } from '../../types/order.types';
import { PrintWaybillModal } from '../orders/PrintWaybillModal';
import { orderApi } from '../../api/order.api';

interface TrackingModalProps {
  order: Order | null;
  isOpen?: boolean;
  onClose: () => void;
  onEditOrder?: (order: Order) => void;
  onCancelOrder?: (order: Order) => void;
  onReadyToPick?: (order: Order) => void;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({ order, onClose, onEditOrder, onCancelOrder, onReadyToPick }) => {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [loadingStatusUpdate, setLoadingStatusUpdate] = useState(false);
  if (!order) return null;

  // CHỈ cho phép sửa khi chưa chốt đóng gói hoặc còn trong thời hạn đếm ngược 5 phút
  const isCancelled = order.status === 'CANCELLED';

  // Đếm ngược 5 phút cho phép Hủy đơn & Sửa đơn ở trạng thái READY_TO_PICK
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

  const isWithin5MinWindow = order.status === 'READY_TO_PICK' && secondsRemaining > 0;

  const isEditable = !isCancelled && (
    ['CREATED', 'PENDING_VERIFICATION', 'PENDING'].includes(order.status) ||
    isWithin5MinWindow
  );
  const canReadyToPick = !isCancelled && ['CREATED', 'PENDING_VERIFICATION', 'PENDING'].includes(order.status);

  const canCancel = !isCancelled && (
    ['CREATED', 'PENDING_VERIFICATION', 'PENDING'].includes(order.status) ||
    isWithin5MinWindow
  );

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleReadyToPickClick = async () => {
    if (!order) return;
    if (onReadyToPick) {
      onReadyToPick(order);
      onClose();
      return;
    }
    setLoadingStatusUpdate(true);
    try {
      const targetId = order._id || (order as any).id;
      const res = await orderApi.updateOrderStatus(targetId, 'READY_TO_PICK');
      if (res.data?.success) {
        alert(`Đã xác nhận đơn hàng ${order.trackingCode || order.trackingNumber} sẵn sàng thu gom (READY_TO_PICK)!`);
        order.status = 'READY_TO_PICK';
        (order as any).readyToPickAt = new Date().toISOString();
        onClose();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể chuyển trạng thái đơn hàng');
    } finally {
      setLoadingStatusUpdate(false);
    }
  };

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

        {/* Ready to Pick Status Banner (Chưa ấn Chuẩn Bị Xong) */}
        {canReadyToPick && (
          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white">Đơn hàng mới tạo - Chờ đóng gói xong</p>
                <p className="text-[11px] text-slate-300">Xác nhận đã chuẩn bị hàng xong để hệ thống tích hợp vào Tuyến Đường Thu Gom của bưu tá.</p>
              </div>
            </div>
            <button
              onClick={handleReadyToPickClick}
              disabled={loadingStatusUpdate}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              {loadingStatusUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-cyan-200" />}
              <span>Xác Nhận Sẵn Sàng Lấy Hàng</span>
            </button>
          </div>
        )}

        {/* READY_TO_PICK Countdown Banner (Đã đóng gói xong - Đếm ngược 5p cho phép Hủy) */}
        {order.status === 'READY_TO_PICK' && (
          <div className={`p-4 rounded-2xl border text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg ${
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
                    <span>⏳ Bạn có <strong className="text-amber-400 font-mono font-bold text-sm px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">{formatCountdown(secondsRemaining)}</strong> để chỉnh sửa thông tin hoặc hủy đơn nếu đổi ý trước khi khóa tuyến thu gom.</span>
                  ) : (
                    <span className="text-rose-400 font-bold">🔒 Đã HẾT thời hạn 5 phút. Thông tin đơn hàng đã khóa hoàn toàn và đưa vào Tuyến Thu Gom.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Telematics GPS Live Tracking Banner - Chỉ hiển thị khi đang ở Chặng Giao Cuối (OUT_FOR_DELIVERY / DELIVERING) */}
        {['OUT_FOR_DELIVERY', 'DELIVERING', 'LAST_MILE_DELIVERING'].includes(order.status) && (order as any).live_tracking?.is_active && !(order as any).live_tracking?.hideMap ? (
          <div className={`p-4 rounded-2xl border text-xs font-medium space-y-2 ${
            (order as any).live_tracking.status === 'LOST_SIGNAL'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : (order as any).live_tracking.status === 'DEGRADED_SIGNAL'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  (order as any).live_tracking.status === 'LIVE' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`} />
                <span>
                  {(order as any).live_tracking.status === 'LIVE' && '📡 Chặng Giao Cuối: Vị trí GPS Shipper đang cập nhật trực tiếp'}
                  {(order as any).live_tracking.status === 'DEGRADED_SIGNAL' && '⚠️ Chặng Giao Cuối: Tín hiệu GPS không ổn định'}
                  {(order as any).live_tracking.status === 'LOST_SIGNAL' && '⚠️ Chặng Giao Cuối: Tạm mất kết nối GPS với tài xế'}
                </span>
              </div>
              <span className="font-mono text-[11px] opacity-80">
                Tài xế phụ trách: {(order as any).live_tracking.driver_name || 'Nguyễn ***'} (SĐT: {(order as any).live_tracking.driver_phone || '*******998'})
              </span>
            </div>
            {(order as any).live_tracking.stale_warning && (
              <p className="text-[11px] opacity-90 pl-4 border-l-2 border-current">
                {(order as any).live_tracking.stale_warning}
              </p>
            )}
          </div>
        ) : (
          !isCancelled && (
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                <span>📍 Bản đồ GPS vị trí Shipper sẽ tự động bật khi đơn hàng ở chặng giao cuối (Đang phát hàng).</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">Trạng thái: {order.status}</span>
            </div>
          )
        )}

        {/* Visual Timeline Bar & Detailed Milestone Timestamps */}
        {!isCancelled && (
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tiến Trình & Các Mốc Thời Gian Đã Đi Qua</h4>
            
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

            {/* TikTok-Shop Style Detailed Station & Hub Timeline (Order Tracking Logs) */}
            {Array.isArray((order as any).trackingTimeline) && (order as any).trackingTimeline.length > 0 ? (
              <div className="pt-4 border-t border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    📍 Nhật Ký Vận Chuyển Chi Tiết Qua Các Bưu Cục & Trung Tâm Phân Loại
                  </span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">
                    TikTok-Shop Style Log
                  </span>
                </div>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {(order as any).trackingTimeline.map((log: any, idx: number) => {
                    const isFirst = idx === 0;
                    return (
                      <div key={idx} className="relative group">
                        {/* Timeline Node Icon */}
                        <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                          isFirst
                            ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50 scale-110'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}>
                          {isFirst ? '●' : '○'}
                        </div>

                        <div className={`p-3.5 rounded-2xl border transition-all ${
                          isFirst
                            ? 'bg-slate-900/90 border-blue-500/40 shadow-md shadow-blue-500/10'
                            : 'bg-slate-950/40 border-slate-800/80'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <h5 className={`text-xs font-bold ${isFirst ? 'text-blue-400' : 'text-slate-200'}`}>
                              {log.title}
                            </h5>
                            <span className="text-[10px] font-mono text-slate-400">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : ''}
                            </span>
                          </div>

                          {log.description && (
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {log.description}
                            </p>
                          )}

                          {log.locationName && (
                            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{log.locationName}</span>
                            </div>
                          )}

                          {/* Driver Info Box for OUT_FOR_DELIVERY */}
                          {log.driverInfo && (
                            <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                                  👤
                                </div>
                                <div>
                                  <div className="font-bold text-white">{log.driverInfo.name}</div>
                                  <div className="text-[10px] text-slate-400">SĐT: {log.driverInfo.phone}</div>
                                </div>
                              </div>
                              <a
                                href={`tel:${log.driverInfo.hotline || '19001088'}`}
                                className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                              >
                                📞 Hotline {log.driverInfo.hotline || '19001088'}
                              </a>
                            </div>
                          )}

                          {/* Proof of Delivery (POD) Image Preview */}
                          {(log.podImageUrl || (isFirst && (order as any).podImageUrl)) && (
                            <div className="mt-3 space-y-1.5">
                              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                📸 Ảnh xác nhận giao hàng (POD - Proof of Delivery):
                              </div>
                              <img
                                src={log.podImageUrl || (order as any).podImageUrl}
                                alt="Proof of Delivery"
                                className="w-full max-h-48 object-cover rounded-xl border border-slate-700 shadow-md"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Fallback Detailed Timeline List if trackingTimeline is empty */
              Array.isArray((order as any).timeline) && (order as any).timeline.length > 0 && (
                <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Lịch sử mốc thời gian chi tiết:</span>
                  <div className="space-y-2">
                    {(order as any).timeline.map((item: any, idx: number) => {
                      if (!item.isCompleted) return null;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/40 border border-slate-800/60">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className="font-semibold text-slate-200">{item.title}</span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : 'Đã cập nhật'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
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

          {/* Receiver (Supports Masked PII) */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Nơi Nhận ({(order as any).recipient?.addressMasked || order.deliveryAddress?.province || order.destinationCity || 'Hà Nội'})
            </div>
            <div className="text-sm font-bold text-white">{(order as any).recipient?.fullName || order.deliveryAddress?.fullName || order.recipientName}</div>
            <div className="text-xs text-slate-400">{(order as any).recipient?.addressMasked || order.deliveryAddress?.address || order.recipientAddress}</div>
            <div className="text-xs text-slate-500 font-mono">SĐT: {(order as any).recipient?.phone || order.deliveryAddress?.phone}</div>
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
            {canReadyToPick && (
              <button
                onClick={handleReadyToPickClick}
                disabled={loadingStatusUpdate}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Xác nhận đã đóng gói xong để hệ thống đưa vào tuyến thu gom"
              >
                {loadingStatusUpdate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-cyan-200" />}
                Chuẩn Bị Xong
              </button>
            )}

            {canCancel && onCancelOrder && (
              <button
                onClick={() => onCancelOrder(order)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
                title={order.status === 'READY_TO_PICK' ? `Hủy đơn trong thời hạn 5 phút (Còn ${formatCountdown(secondsRemaining)})` : "Hủy đơn hàng này"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hủy Đơn Hàng {order.status === 'READY_TO_PICK' && secondsRemaining > 0 && `(${formatCountdown(secondsRemaining)})`}
              </button>
            )}

            {isEditable && onEditOrder && (
              <button
                onClick={() => onEditOrder(order)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
                title="Chỉnh sửa thông tin đơn hàng"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Chỉnh Sửa Thông Tin
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-400" />
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

      {showPrintModal && (
        <PrintWaybillModal order={order} onClose={() => setShowPrintModal(false)} />
      )}
    </div>
  );
};

