import React, { useState } from 'react';
import { CameraScanner } from '@/components/driver/CameraScanner';
import { driverApi } from '@/api/driver.api';
import { Truck, CheckCircle2, AlertTriangle, Navigation, MapPin, Send, History } from 'lucide-react';

export const DriverPickupPage: React.FC = () => {
  const [manualCode, setManualCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [history, setHistory] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lấy GPS tọa độ thiết bị (Trả về undefined nếu thiết bị từ chối hoặc timeout để Backend nhận biết gpsMissing)
  const getGpsPosition = (): Promise<{ latitude?: number; longitude?: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ latitude: undefined, longitude: undefined });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({ latitude: undefined, longitude: undefined }), // Fallback nếu tài xế tắt GPS
        { timeout: 4000, enableHighAccuracy: true }
      );
    });
  };

  const handleExecutePickup = async (trackingCode: string) => {
    const cleanCode = trackingCode.trim().toUpperCase();
    if (!cleanCode || loading) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      const coords = await getGpsPosition();
      const res = await driverApi.confirmPickup({
        tracking_code: cleanCode,
        latitude: coords.latitude,
        longitude: coords.longitude
      });

      const responseItem = res.data || {
        tracking_code: cleanCode,
        status: 'PICKED_UP',
        picked_at: new Date().toISOString(),
        seller_name: 'Shop Kho Hàng',
        destination_hub_name: 'Kho Gốc'
      };

      setStatusMsg({ type: 'success', text: `✅ Đã lấy đơn [${cleanCode}] thành công!` });
      setHistory((prev) => [responseItem, ...prev]);
      setManualCode('');
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || `❌ Lỗi xác nhận đơn ${cleanCode}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3 max-w-md mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 pb-20">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-400" />
            Tài Xế Lấy Hàng (Pickup PWA)
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400" /> Tự động ghi nhận vị trí GPS
          </p>
        </div>
        <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-1 rounded-lg border border-blue-500/30">
          UC-12 Active
        </span>
      </div>

      {/* Camera QR Scanner */}
      <CameraScanner
        onScanSuccess={handleExecutePickup}
        isScanning={isCameraActive}
        onToggleScan={setIsCameraActive}
      />

      {/* Nhập mã thủ công */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-sm space-y-2">
        <label className="text-xs font-semibold text-slate-300 block">Hoặc nhập thủ công mã vận đơn:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExecutePickup(manualCode);
            }}
            placeholder="VD: ELG17866916..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm uppercase font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="button"
            onClick={() => handleExecutePickup(manualCode)}
            disabled={loading || !manualCode.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {loading ? (
              <span className="animate-spin text-sm">⏳</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Nhận
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thông báo kết quả */}
      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border shadow-md animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              : 'bg-rose-950/80 text-rose-300 border-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Danh sách các đơn vừa lấy trong ca */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-sm flex-1 flex flex-col min-h-[160px]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-cyan-400" />
            Đơn đã lấy gần nhất ({history.length})
          </h3>
        </div>
        <div className="space-y-2 overflow-y-auto max-h-64 flex-1 pr-1 custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs italic">
              Chưa lấy đơn nào trong ca. Quét mã QR hoặc nhập thủ công để xác nhận lấy hàng.
            </div>
          ) : (
            history.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs flex justify-between items-center transition hover:border-slate-700"
              >
                <div>
                  <p className="font-mono font-bold text-cyan-400">{item.tracking_code || item.trackingCode}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    Shop: {item.seller_name || 'Seller Direct'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md font-bold text-[10px]">
                    ĐÃ LẤY HÀNG
                  </span>
                  <p className="text-slate-500 text-[9px] mt-1 flex items-center justify-end gap-1 font-mono">
                    <Navigation className="w-2.5 h-2.5 text-cyan-500" />
                    {new Date(item.picked_at || Date.now()).toLocaleTimeString('vi-VN')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverPickupPage;
