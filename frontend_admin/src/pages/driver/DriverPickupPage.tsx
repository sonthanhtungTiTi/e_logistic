import React, { useState } from 'react';
import { CameraScanner } from '@/components/driver/CameraScanner';
import { SellerSignatureModal } from '@/components/driver/SellerSignatureModal';
import { driverApi } from '@/api/driver.api';
import { Truck, CheckCircle2, AlertTriangle, Navigation, MapPin, Send, History } from 'lucide-react';

export const DriverPickupPage: React.FC = () => {
  const [manualCode, setManualCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [history, setHistory] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Danh sách các kiện hàng đã quét tại Shop này (Chờ Seller ký tên 1 lần duy nhất)
  const [stagingBatch, setStagingBatch] = useState<string[]>([]);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);

  // Lấy GPS tọa độ thiết bị
  const getGpsPosition = (): Promise<{ latitude?: number; longitude?: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ latitude: undefined, longitude: undefined });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({ latitude: undefined, longitude: undefined }),
        { timeout: 4000, enableHighAccuracy: true }
      );
    });
  };

  // Âm thanh phản hồi khi quét mã (Web Audio API)
  const playSound = (type: 'success' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'success' ? 'sine' : 'square';
      osc.frequency.setValueAtTime(type === 'success' ? 880 : 300, ctx.currentTime); // 880Hz Bip vs 300Hz Boop
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (type === 'success' ? 0.15 : 0.3));
    } catch {
      // AudioContext fallback if muted
    }
  };

  // Bước 1: Thêm kiện hàng vào Giỏ Gom Đơn tại Shop (Batch Scan & Realtime Status Verification)
  const handleInitiatePickup = async (trackingCode: string) => {
    if (isSignatureModalOpen) return; // Session Locking: Khóa phiên khi đang mở bảng ký tên
    const cleanCode = trackingCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (stagingBatch.includes(cleanCode)) {
      playSound('error');
      setStatusMsg({ type: 'error', text: `⚠️ Mã vận đơn ${cleanCode} đã có trong Giỏ Gom Đơn hiện tại!` });
      return;
    }

    try {
      setLoading(true);
      setStatusMsg(null);
      // Gọi API Verify Scan để kiểm tra trạng thái thực tế từ Backend trước khi gom đơn
      const checkRes = await driverApi.verifyPickupScan(cleanCode);
      if (checkRes.success) {
        playSound('success');
        setStagingBatch((prev) => [...prev, cleanCode]);
        setStatusMsg({
          type: 'info',
          text: `➕ Đã gom đơn [${cleanCode}] vào lô (Trạng thái: ${checkRes.data?.status || 'Sẵn sàng'}). Total: ${stagingBatch.length + 1} đơn.`
        });
        setManualCode('');
      }
    } catch (err: any) {
      playSound('error');
      const msg = err.response?.data?.message || err.message || 'Lỗi kiểm tra mã vận đơn';
      setStatusMsg({ type: 'error', text: `❌ ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  // Xóa đơn khỏi giỏ gom nếu quét nhầm
  const handleRemoveFromStaging = (codeToRemove: string) => {
    if (isSignatureModalOpen) return;
    setStagingBatch((prev) => prev.filter((c) => c !== codeToRemove));
  };

  // Bước 2: Nhận 1 chữ ký duy nhất cho cả Lô Đơn Hàng từ Seller (ePOH Manifest)
  const handleConfirmBatchWithSignature = async (signatureBase64: string) => {
    if (stagingBatch.length === 0) return;
    setIsSignatureModalOpen(false);
    setLoading(true);
    setStatusMsg(null);

    try {
      const coords = await getGpsPosition();
      const successResults: any[] = [];
      const errorCodes: string[] = [];
      const errorDetails: string[] = [];

      // Gửi xác nhận từng đơn trong lô với cùng 1 chữ ký Seller (Acid Isolation / Batch Processing)
      for (const code of stagingBatch) {
        try {
          const res = await driverApi.confirmPickup({
            tracking_code: code,
            signatureImageUrl: signatureBase64,
            latitude: coords.latitude,
            longitude: coords.longitude
          });

          const orderObj = (res as any).order || res.data?.order || res.data || {};
          const confirmedCode = orderObj.trackingCode || orderObj.tracking_code || code;

          successResults.push({
            tracking_code: confirmedCode,
            trackingCode: confirmedCode,
            status: 'PICKED_UP',
            picked_at: orderObj.updatedAt || new Date().toISOString(),
            seller_name: orderObj.pickupAddress?.fullName || 'Seller Direct',
            destination_hub_name: orderObj.deliveryAddress?.province || 'Kho Gốc'
          });
        } catch (err: any) {
          console.error(`Lỗi xác nhận đơn ${code}:`, err);
          const backendMsg = err.response?.data?.message || err.message || 'Lỗi xác nhận từ Server';
          errorDetails.push(`${code}: ${backendMsg}`);
          errorCodes.push(code);
        }
      }

      if (successResults.length > 0) {
        setHistory((prev) => [...successResults, ...prev]);
        setStagingBatch(errorCodes); // Giữ lại những đơn bị lỗi nếu có

        if (errorCodes.length === 0) {
          playSound('success');
          setStatusMsg({ type: 'success', text: `🎉 Đã tạo ePOH & chốt thành công ${successResults.length} đơn hàng tại Shop này!` });
        } else {
          playSound('error');
          setStatusMsg({
            type: 'error',
            text: `⚠️ Đã chốt ${successResults.length} đơn thành công. Lỗi ${errorCodes.length} đơn:\n• ` + errorDetails.join('\n• ')
          });
        }
      } else {
        // TẤT CẢ ĐƠN TRONG LÔ ĐỀU LỖI (Ví dụ: Seller chưa bấm "Chuẩn Bị Xong", đơn ở trạng thái CREATED)
        playSound('error');
        setStatusMsg({
          type: 'error',
          text: `❌ Không thể xác nhận lấy hàng! Chi tiết:\n• ` + errorDetails.join('\n• ')
        });
      }
    } catch (err: any) {
      playSound('error');
      setStatusMsg({
        type: 'error',
        text: err.message || '❌ Có lỗi xảy ra khi chốt Biên bản Bàn giao lô hàng.'
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
        onScanSuccess={handleInitiatePickup}
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
              if (e.key === 'Enter') handleInitiatePickup(manualCode);
            }}
            placeholder="VD: ELG17866916..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm uppercase font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="button"
            onClick={() => handleInitiatePickup(manualCode)}
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

      {/* Danh sách Kiện hàng gom tại Shop hiện tại (Chờ ký tên ePOH 1 lần) */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <span className="text-sm">🛍️</span> Lô Gom Đơn Tại Shop ({stagingBatch.length} kiện)
          </h3>
          {stagingBatch.length > 0 && (
            <button
              onClick={() => setStagingBatch([])}
              className="text-[10px] text-rose-400 hover:underline cursor-pointer"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {stagingBatch.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic text-center py-3 bg-slate-950/60 rounded-xl border border-slate-800">
            Quét mã QR liên tục để thêm nhiều kiện hàng của Shop vào lô này trước khi chốt ký.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
              {stagingBatch.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1.5 bg-blue-950/80 border border-blue-800 text-blue-300 px-2.5 py-1 rounded-xl text-xs font-mono font-bold"
                >
                  {code}
                  <button
                    onClick={() => handleRemoveFromStaging(code)}
                    className="hover:text-rose-400 cursor-pointer font-sans"
                    title="Xóa đơn này khỏi lô gom"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsSignatureModalOpen(true)}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>✍️</span> Chốt ePOH & Cho Seller Ký Tên ({stagingBatch.length} Đơn)
            </button>
          </div>
        )}
      </div>

      {/* Modal Ký Tên Bàn Giao Điện Tử ePOH 1 Lần Duy Nhất Cho Cả Lô (UC-12 Bước 9 & 10) */}
      {isSignatureModalOpen && (
        <SellerSignatureModal
          orderCount={stagingBatch.length}
          trackingCode={stagingBatch[0]}
          onConfirm={handleConfirmBatchWithSignature}
          onClose={() => setIsSignatureModalOpen(false)}
        />
      )}

      {/* Thông báo kết quả */}
      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border shadow-md animate-fade-in ${statusMsg.type === 'success'
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
            : statusMsg.type === 'info'
              ? 'bg-blue-950/80 text-cyan-300 border-cyan-800'
              : 'bg-rose-950/80 text-rose-300 border-rose-800'
            }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : statusMsg.type === 'info' ? (
            <span className="text-cyan-400 shrink-0 mt-0.5 font-bold">ℹ️</span>
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span className="whitespace-pre-line">{statusMsg.text}</span>
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
