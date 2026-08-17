import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, CameraOff, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface CameraScannerProps {
  onScanSuccess?: (decodedText: string) => void;
  onScan?: (decodedText: string) => void;
  isScanning?: boolean;
  isActive?: boolean;
  onToggleScan?: (active: boolean) => void;
  title?: string;
  subtitle?: string;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanSuccess,
  onScan,
  isScanning,
  isActive,
  onToggleScan,
  title = 'Camera Quét Mã Kiện Hàng & Mã Seal',
  subtitle = 'Hỗ trợ Barcode 1D (Code 128/39/EAN/UPC) và 2D QR Code',
}) => {
  const isScanningActive = isScanning ?? isActive ?? false;
  const handleSuccess = onScanSuccess || onScan || (() => {});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // ID DOM duy nhất cho container camera, tránh xung đột Virtual DOM React
  const [scannerId] = useState<string>(
    () => `camera-reader-${Math.random().toString(36).substring(2, 9)}`
  );
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedTextRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);

  // Âm thanh Beep khi quét thành công
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Bỏ qua lỗi audio nếu trình duyệt chặn autoplay
    }
  }, []);

  const handleScanDecoded = useCallback(
    (decodedText: string) => {
      const cleanText = decodedText.trim().toUpperCase();
      if (!cleanText) return;

      const now = Date.now();
      // Chống quét trùng liên tục trong vòng 2 giây cho cùng 1 mã
      if (cleanText === lastScannedTextRef.current && now - lastScanTimeRef.current < 2000) {
        return;
      }
      // Chống quét 2 mã khác nhau quá nhanh (< 800ms)
      if (now - lastScanTimeRef.current < 800) {
        return;
      }

      lastScanTimeRef.current = now;
      lastScannedTextRef.current = cleanText;
      setLastScannedCode(cleanText);
      playBeep();

      handleSuccess(cleanText);

      // Ẩn badge mã vừa quét sau 2.5 giây
      setTimeout(() => {
        if (isMountedRef.current) {
          setLastScannedCode((prev) => (prev === cleanText ? null : prev));
        }
      }, 2500);
    },
    [handleSuccess, playBeep]
  );

  const stopCamera = async () => {
    setErrorMsg(null);
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Lỗi khi dừng camera:', e);
      }
      html5QrCodeRef.current = null;
    }
    if (isMountedRef.current) {
      onToggleScan?.(false);
      setIsStarting(false);
    }
  };

  const startCamera = async () => {
    if (isStarting) return;
    setErrorMsg(null);

    // Kiểm tra bảo mật HTTP (Chrome chặn camera trên HTTP ngoại trừ localhost)
    const isSecureOrigin =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecureOrigin) {
      setErrorMsg(
        '⚠️ Trình duyệt chặn Camera trên kết nối HTTP không bảo mật (IP local). Vui lòng dùng link HTTPS hoặc nhập tay mã vận đơn bên dưới.'
      );
      return;
    }

    setIsStarting(true);

    // Dọn dẹp phiên trước nếu còn
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }

    try {
      const scanner = new Html5Qrcode(scannerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.PDF_417,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = scanner;

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Tối ưu khung quét cho cả Barcode 1D ngang dài và QR code vuông
          const w = Math.floor(Math.min(viewfinderWidth * 0.88, 360));
          const h = Math.floor(Math.min(viewfinderHeight * 0.68, 220));
          return { width: Math.max(w, 220), height: Math.max(h, 130) };
        },
        aspectRatio: 1.777778,
      };

      try {
        await scanner.start(
          { facingMode: 'environment' },
          qrConfig,
          (decodedText) => handleScanDecoded(decodedText),
          () => {}
        );
      } catch (firstErr) {
        // Fallback: Lấy danh sách camera vật lý của thiết bị
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const cameraId = devices[devices.length - 1].id;
          await scanner.start(
            cameraId,
            qrConfig,
            (decodedText) => handleScanDecoded(decodedText),
            () => {}
          );
        } else {
          throw firstErr;
        }
      }

      if (isMountedRef.current) {
        onToggleScan?.(true);
        setIsStarting(false);
      }
    } catch (err: any) {
      console.error('Không thể mở Camera:', err);
      if (isMountedRef.current) {
        setIsStarting(false);
        onToggleScan?.(false);
        const name = err?.name || '';
        const msg = String(err?.message || err || '');
        if (name === 'NotAllowedError' || msg.includes('Permission') || msg.includes('denied')) {
          setErrorMsg(
            'Quyền truy cập Camera bị từ chối. Vui lòng cho phép quyền Camera trên trình duyệt (biểu tượng Camera trên thanh URL) hoặc sử dụng nhập mã thủ công.'
          );
        } else if (name === 'NotFoundError' || msg.includes('device') || msg.includes('camera')) {
          setErrorMsg('Không tìm thấy thiết bị Camera. Vui lòng kết nối Camera hoặc dùng súng quét mã vạch / nhập thủ công.');
        } else {
          setErrorMsg(`Không thể kết nối Camera (${msg || 'Lỗi thiết bị'}). Vui lòng kiểm tra quyền hoặc nhập thủ công.`);
        }
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current
              .stop()
              .then(() => {
                html5QrCodeRef.current?.clear();
              })
              .catch(() => {});
          }
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-cyan-400" />
            {title}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <span
          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase transition ${
            isScanningActive
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          {isScanningActive ? 'Đang bật' : 'Đang tắt'}
        </span>
      </div>

      {/* Camera Viewport Wrapper */}
      <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[220px] flex items-center justify-center">
        {/* DOM container chuyên biệt cho Html5Qrcode - Tuyệt đối không đặt con Virtual DOM của React vào đây */}
        <div
          id={scannerId}
          className={`w-full overflow-hidden ${isScanningActive ? 'block' : 'hidden'}`}
          style={{ minHeight: isScanningActive ? '220px' : '0px' }}
        />

        {/* Màn hình chờ khi Camera Tắt */}
        {!isScanningActive && (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shadow-inner">
              <CameraOff className="w-6 h-6" />
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Camera đang tắt. Nhấn nút bên dưới để mở quét mã.
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Quét: Barcode mã vận đơn (Code 128 / Code 39 / QR) &amp; Mã Seal bao tải
            </span>
          </div>
        )}

        {/* Khung ngắm & Hiệu ứng quét khi Camera Bật */}
        {isScanningActive && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
            <div className="w-64 h-32 border-2 border-cyan-400/70 rounded-xl relative shadow-[0_0_25px_rgba(6,182,212,0.25)] flex items-center justify-center bg-cyan-500/5">
              {/* 4 góc ngắm */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-300 -mt-0.5 -ml-0.5 rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-300 -mt-0.5 -mr-0.5 rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-300 -mb-0.5 -ml-0.5 rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-300 -mb-0.5 -mr-0.5 rounded-br-sm" />

              {/* Tia laser quét */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
            </div>

            {/* Thông báo mã vừa quét */}
            {lastScannedCode && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-emerald-500/60 text-emerald-300 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold shadow-xl flex items-center gap-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Đã nhận diện: {lastScannedCode}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thông báo lỗi nếu không mở được Camera */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Lỗi Camera:</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Nút Điều Khiển Camera */}
      <div className="flex gap-2">
        {!isScanningActive ? (
          <button
            type="button"
            onClick={startCamera}
            disabled={isStarting}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isStarting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang mở Camera...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Mở Camera Quét
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CameraOff className="w-4 h-4" />
            Tắt Camera
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraScanner;
