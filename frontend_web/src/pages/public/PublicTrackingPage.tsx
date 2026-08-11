import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Clock, AlertTriangle, Navigation, User, Phone } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import axiosClient from '../../api/axiosClient';

interface LiveTrackingData {
  is_active: boolean;
  is_gps_stale: boolean;
  stale_warning: string | null;
  driver_name: string;
  driver_phone: string;
  current_location: { lat: number; lng: number };
  destination_location: { lat: number; lng: number };
  eta_minutes: number | null;
}

interface TimelineItem {
  status: string;
  title: string;
  time: string;
}

interface PublicTrackingData {
  tracking_number: string;
  status: string;
  status_text: string;
  receiver: {
    name: string;
    phone: string;
    address: string;
  };
  timeline: TimelineItem[];
  live_tracking?: LiveTrackingData;
}

let socket: Socket | null = null;

export const PublicTrackingPage: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState('EL260810X8F9');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<PublicTrackingData | null>(null);
  const [driverGps, setDriverGps] = useState<{ lat: number; lng: number } | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [isGpsStale, setIsGpsStale] = useState<boolean>(false);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackingNumber.trim()) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const cleanCode = trackingNumber.trim().toUpperCase();
      const res = await axiosClient.get<{ success: boolean; data: PublicTrackingData }>(`/orders/track/${cleanCode}`);
      
      const data = res.data.data;
      setOrderData(data);

      if (data.live_tracking?.is_active) {
        setDriverGps(data.live_tracking.current_location);
        setEtaMinutes(data.live_tracking.eta_minutes);
        setIsGpsStale(data.live_tracking.is_gps_stale);
        setStaleWarning(data.live_tracking.stale_warning);

        // Join Socket.io Room Pattern
        if (!socket) {
          socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
        }
        socket.emit('join_order_tracking', cleanCode);
      } else {
        setDriverGps(null);
      }
    } catch (err: any) {
      setOrderData(null);
      if (err.response?.status === 429) {
        setErrorMsg('Bạn đã thao tác quá nhiều lần (Vượt quá 10 lượt/phút). Vui lòng thử lại sau 1 phút.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Không tìm thấy đơn hàng với mã vận đơn này. Vui lòng kiểm tra lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Connect Socket & Listen to targeted Room events
    if (!socket) {
      socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
    }

    socket.on('gps_updated', (gpsData: any) => {
      setDriverGps({ lat: gpsData.lat, lng: gpsData.lng });
      setEtaMinutes(gpsData.eta_minutes);
      setIsGpsStale(gpsData.is_gps_stale || false);
      setStaleWarning(null);
    });

    return () => {
      if (socket) {
        socket.off('gps_updated');
      }
    };
  }, []);

  // Demo helper: simulate driver GPS movement
  const handleSimulateDriverMove = () => {
    if (!socket || !orderData) return;
    const newLat = (driverGps?.lat || 10.776889) + (Math.random() * 0.002 - 0.001);
    const newLng = (driverGps?.lng || 106.700806) + (Math.random() * 0.002 - 0.001);
    const newEta = Math.max(2, (etaMinutes || 12) - 1);

    socket.emit('update_driver_location', {
      trackingNumber: orderData.tracking_number,
      lat: newLat,
      lng: newLng,
      etaMinutes: newEta,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase">
          <ShieldCheck className="w-4 h-4" /> Bảo Mật Thông Tin Cá Nhân (PII Masking)
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white">Tra Cứu Hành Trình Đơn Hàng</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Nhập mã vận đơn để theo dõi tiến trình xử lý, thời gian giao hàng & tọa độ GPS thời gian thực (Real-time WebSocket).
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Nhập mã vận đơn (VD: EL260810X8F9 hoặc VN-LOG-554109)..."
            className="w-full glass-input rounded-2xl pl-12 pr-4 py-3.5 text-sm font-mono text-white placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Clock className="w-4 h-4 animate-spin" /> Đang Tra Cứu...
            </>
          ) : (
            'Tra Cứu Ngay'
          )}
        </button>
      </form>

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Result Display Box */}
      {orderData && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
          
          {/* Top Bar: Tracking Code & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Mã Vận Đơn Bưu Gửi</span>
              <h2 className="text-xl sm:text-2xl font-mono font-black text-blue-400">
                {orderData.tracking_number}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3.5 py-1.5 rounded-full font-extrabold text-xs uppercase border ${
                orderData.status === 'DELIVERED'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : ['OUT_FOR_DELIVERY', 'DELIVERING'].includes(orderData.status)
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
                {orderData.status_text || orderData.status}
              </span>
            </div>
          </div>

          {/* Masked PII Receiver Box */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" /> Thông Tin Người Nhận (Đã Che Mờ - Masked PII)
              </span>
              <span className="text-[10px] font-mono text-slate-500">Quyền riêng tư được bảo vệ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Tên người nhận:</span>
                <strong className="text-white font-mono">{orderData.receiver.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Số điện thoại:</span>
                <strong className="text-white font-mono">{orderData.receiver.phone}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Địa chỉ giao hàng:</span>
                <strong className="text-slate-300 block truncate">{orderData.receiver.address}</strong>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Lịch Sử Hành Trình Bưu Bưu Cục
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {orderData.timeline.map((item, idx) => (
                <div key={idx} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-slate-950 flex items-center justify-center text-[10px] text-white font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{item.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {new Date(item.time).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live GPS Tracking (WebSocket Room Pattern) */}
          {orderData.live_tracking?.is_active && (
            <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-4">
              
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </div>
                  <h4 className="font-bold text-sm text-white">Đang Giao Hàng Chặng Cuối (Live GPS Real-time)</h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulateDriverMove}
                    className="px-3 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[11px] font-bold cursor-pointer transition flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Mô phỏng tài xế di chuyển GPS
                  </button>
                </div>
              </div>

              {/* Graceful Degradation Warning (8.2) */}
              {isGpsStale && (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{staleWarning || 'Vị trí cập nhật vài phút trước. Tín hiệu GPS từ Shipper tạm thời gián đoạn.'}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Tài Xế Phụ Trách:</span>
                  <strong className="text-white flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-400" /> {orderData.live_tracking.driver_name}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    <Phone className="w-3 h-3 inline mr-1" /> {orderData.live_tracking.driver_phone}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Tọa Độ GPS Shipper:</span>
                  {driverGps ? (
                    <strong className="text-cyan-400 font-mono">
                      {driverGps.lat.toFixed(6)}, {driverGps.lng.toFixed(6)}
                    </strong>
                  ) : (
                    <span className="text-slate-500">Đang đợi tọa độ...</span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Dự Kiến Giao Đến (ETA):</span>
                  {isGpsStale ? (
                    <span className="text-amber-400 font-bold">Tạm ngưng tính ETA</span>
                  ) : (
                    <strong className="text-emerald-400 font-mono text-sm">
                      ~{etaMinutes || 12} phút
                    </strong>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
