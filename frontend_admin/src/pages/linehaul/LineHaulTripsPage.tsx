import React, { useState, useEffect, useCallback } from 'react';
import { Truck, ArrowRight, RefreshCw } from 'lucide-react';
import { outboundApi } from '@/api/outbound.api';

export const LineHaulTripsPage: React.FC = () => {
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [trips, setTrips] = useState<any[]>([]);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await outboundApi.getTrips();
      if (res.data && res.data.length > 0) {
        setTrips(
          res.data.map((t: any) => ({
            id: t._id || t.id,
            tripCode: t.tripCode || t.trip_code,
            originHub: t.originHubId?.name || t.originHubId?.code || 'Kho Xuất',
            destHub: t.destinationHubId?.name || t.destinationHubId?.code || 'Kho Đích',
            route: `${t.originHubId?.code || 'Gốc'} → ${t.destinationHubId?.code || 'Đích'}`,
            distance: '500+ km',
            bagsCount: (t.scannedItems || []).filter((i: any) => i.sealCode || i.trackingCode?.startsWith('SEAL-')).length,
            itemsCount: t.scannedItems?.length || t.plannedTrackingCodes?.length || 0,
            status: t.status,
            departureTime: 'Hôm nay',
          }))
        );
      } else {
        setTrips([]);
      }
    } catch (err) {
      console.warn('Load trips error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleConfirmTrip = async (tripCode: string) => {
    try {
      await outboundApi.driverConfirmTrip(tripCode, { action: 'ACCEPT' });
      setTrips((prev) =>
        prev.map((t) => (t.tripCode === tripCode ? { ...t, status: 'CONFIRMED' } : t))
      );
      setMsg({ type: 'success', text: `✅ Đã chấp nhận chuyến xe [${tripCode}]. Sẵn sàng xuất bến!` });
      loadTrips();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi khi chấp nhận chuyến' });
    }
  };

  const handleRejectTrip = async (tripCode: string) => {
    const reason = prompt('Nhập lý do từ chối chuyến xe (Xe hỏng / Đầy ca / Sự cố cá nhân):', 'Xe gặp sự cố kỹ thuật');
    if (!reason) return;

    try {
      await outboundApi.driverConfirmTrip(tripCode, { action: 'REJECT', reject_reason: reason });
      setTrips((prev) => prev.filter((t) => t.tripCode !== tripCode));
      setMsg({ type: 'error', text: `❌ Đã từ chối chuyến xe [${tripCode}]: "${reason}"` });
      loadTrips();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi khi từ chối chuyến' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-orange-400" />
            Lịch Trình Chuyến Xe Liên Tỉnh
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Xác nhận chuyến xe được Điều Phối Vận Tải gán</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTrips}
            title="Làm mới danh sách"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-[10px] bg-orange-500/20 text-orange-300 font-bold px-2 py-1 rounded-lg border border-orange-500/30 font-mono">
            {trips.length} chuyến
          </span>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Trips List */}
      <div className="space-y-3">
        {trips.map((trip) => (
          <div key={trip.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-black text-orange-400">{trip.tripCode}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                  trip.status === 'CONFIRMED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                }`}
              >
                {trip.status === 'CONFIRMED' ? 'Đã Chấp Nhận' : 'Chờ Bạn Xác Nhận'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-850 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span>{trip.originHub}</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span className="text-cyan-400">{trip.destHub}</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Khoảng cách: ~{trip.distance}</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">Giờ chạy: {trip.departureTime}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-850">
                <span className="text-[10px] text-slate-500 block">Bao niêm phong</span>
                <span className="font-bold text-slate-200">{trip.bagsCount} bao seal</span>
              </div>
              <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-850">
                <span className="text-[10px] text-slate-500 block">Tổng số bưu kiện</span>
                <span className="font-bold text-cyan-400">{trip.itemsCount} kiện hàng</span>
              </div>
            </div>

            {trip.status === 'LOCKED_PENDING_DRIVER_CONFIRM' && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleRejectTrip(trip.tripCode)}
                  className="py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition"
                >
                  Từ Chối
                </button>
                <button
                  onClick={() => handleConfirmTrip(trip.tripCode)}
                  className="py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-xs transition shadow-lg shadow-orange-500/20"
                >
                  Chấp Nhận Chuyến
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LineHaulTripsPage;
