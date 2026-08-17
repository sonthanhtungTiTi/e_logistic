import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface CameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isScanning: boolean;
  onToggleScan: (active: boolean) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanSuccess,
  isScanning,
  onToggleScan,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const startCamera = async () => {
    setErrorMsg(null);

    // Kiểm tra bảo mật HTTP (Chrome chặn camera trên HTTP ngoại trừ localhost)
    const isSecureOrigin =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecureOrigin) {
      setErrorMsg(
        '⚠️ Trình duyệt chặn Camera trên kết nối HTTP không bảo mật (IP local). Vui lòng dùng link HTTPS (localtunnel) hoặc nhập tay mã vận đơn bên dưới.'
      );
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('camera-container');
      html5QrCodeRef.current = html5QrCode;
      onToggleScan(true);

      const qrConfig = { fps: 10, qrbox: { width: 220, height: 220 } };

      const onScan = (decodedText: string) => {
        onScanSuccess(decodedText);
        try {
          html5QrCode.pause(true);
          setTimeout(() => {
            try {
              html5QrCode.resume();
            } catch (e) {
              /* Ignore resume error */
            }
          }, 2000);
        } catch (e) {
          console.warn('Pause error:', e);
        }
      };

      try {
        // Ưu tiên Camera sau (environment)
        await html5QrCode.start({ facingMode: 'environment' }, qrConfig, onScan, () => {});
      } catch (firstErr) {
        // Fallback: Lấy danh sách camera vật lý của thiết bị
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const cameraId = devices[devices.length - 1].id; // Lấy camera sau cùng
          await html5QrCode.start(cameraId, qrConfig, onScan, () => {});
        } else {
          throw firstErr;
        }
      }
    } catch (err: any) {
      onToggleScan(false);
      const msg = err?.message || err?.toString() || '';
      if (msg.includes('Permission') || msg.includes('NotAllowedError')) {
        setErrorMsg('❌ Trình duyệt bị từ chối quyền Camera. Hãy vào Cài đặt Chrome ➔ Quyền ➔ Bật Camera.');
      } else {
        setErrorMsg('❌ Không thể mở Camera. Vui lòng kiểm tra quyền truy cập hoặc sử dụng ô nhập mã thủ công.');
      }
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.warn('Stop camera error:', e);
      }
      html5QrCodeRef.current = null;
      onToggleScan(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-cyan-400" />
          Camera Quét Mã Kiện Hàng
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isScanning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
          {isScanning ? 'Đang bật' : 'Đang tắt'}
        </span>
      </div>

      <div className="w-full bg-black rounded-xl overflow-hidden min-h-[220px] flex items-center justify-center text-slate-500 text-xs border border-slate-800 relative">
        <div id="camera-container" className="w-full h-full min-h-[220px]" />

        {!isScanning && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-2 p-4 text-center z-10 pointer-events-none">
            <CameraOff className="w-8 h-8 text-slate-600" />
            <span>Camera đang tắt. Nhấn nút bên dưới để mở quét mã.</span>
          </div>
        )}

        {isScanning && (
          <button
            type="button"
            onClick={stopCamera}
            title="Đóng Camera"
            className="absolute top-2 right-2 z-20 bg-rose-600/90 hover:bg-rose-600 text-white p-1.5 rounded-full shadow-lg transition flex items-center justify-center"
          >
            <CameraOff className="w-4 h-4" />
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex gap-2">
        {!isScanning ? (
          <button
            type="button"
            onClick={startCamera}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" /> Mở Camera Quét
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CameraOff className="w-4 h-4" /> Tắt Camera
          </button>
        )}
      </div>
    </div>
  );
};
