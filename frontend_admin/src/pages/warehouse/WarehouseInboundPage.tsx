import React, { useState, useRef, useEffect, useCallback } from 'react';
import { warehouseApi } from '@/api/warehouse.api';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CameraScanner } from '@/components/driver/CameraScanner';
import { InboundLogTable } from '@/components/warehouse/InboundLogTable';
import type { ScanItemLog } from '@/components/warehouse/InboundLogTable';
import {
  Barcode,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scale,
  PackageSearch,
  Wifi,
  WifiOff,
  Camera,
  Send,
  ToggleLeft,
  ToggleRight,
  Keyboard,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sinh UUID v4 idempotency key cho mỗi lần quét */
function generateOfflineId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanMode = 'single' | 'seal';

export const WarehouseInboundPage: React.FC = () => {
  // ── Scan input state
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [condition, setCondition] = useState<'INTACT' | 'DAMAGED' | 'TORN_SEAL'>('INTACT');
  const [scanMode, setScanMode] = useState<ScanMode>('single');

  // ── Camera state (Camera là mặc định — UC-16 § 3.1)
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  /** Mặc định ẩn nhập tay; chỉ hiện khi camera không dùng được */
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  // ── Weight measurement
  const [hubWeight, setHubWeight] = useState<string>('');

  // ── Logs & stats (lưu local storage để F5 không mất data)
  const [scanLogs, setScanLogs] = useLocalStorage<ScanItemLog[]>('inbound_scanLogs', []);
  const [stats, setStats] = useLocalStorage('inbound_stats', { total: 0, success: 0, failed: 0 });

  // ── Incident report panel (hiện khi condition !== INTACT)
  const [incidentPhotos, setIncidentPhotos] = useState<string[]>([]);
  const [incidentNote, setIncidentNote] = useState<string>('');
  const [incidentSending, setIncidentSending] = useState(false);
  const [lastScannedForIncident, setLastScannedForIncident] = useState<string | null>(null);

  // ── Offline indicator
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Online/offline listeners
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ── Focus barcode input khi hiện manual input (USB gun support)
  useEffect(() => {
    if (showManualInput) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showManualInput]);

  const handleContainerClick = useCallback(() => {
    if (showManualInput && document.activeElement !== weightInputRef.current) {
      inputRef.current?.focus();
    }
  }, [showManualInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeInboundScan(barcodeInput);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [barcodeInput, condition, scanMode, hubWeight]
  );

  // ─── Core scan logic ────────────────────────────────────────────────────────

  const executeInboundScan = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    // Reset input ngay để nhân viên bóp cò súng quét kiện kế tiếp
    setBarcodeInput('');
    if (showManualInput) inputRef.current?.focus();

    const clientOfflineId = generateOfflineId();

    const isSealCode = scanMode === 'seal' || cleanCode.startsWith('SEAL-') || cleanCode.startsWith('SEAL_') || cleanCode.startsWith('SEAL');

    if (isSealCode) {
      await executeSealScan(cleanCode, clientOfflineId);
    } else {
      await executeSingleScan(cleanCode, clientOfflineId);
    }
  };

  const executeSingleScan = async (cleanCode: string, clientOfflineId: string) => {
    // 1. Kiểm tra trùng mã trong phiên hiện tại (tránh gọi API vô ích)
    const isAlreadyScanned = scanLogs.some((log) => log.tracking_code === cleanCode && log.isSuccess);
    if (isAlreadyScanned) {
      toast.warning(`Mã ${cleanCode} đã được quét trong phiên này!`);
      return;
    }

    const hubMeasuredWeight = hubWeight ? parseFloat(hubWeight) * 1000 : null; // kg → gram

    try {
      const res = await warehouseApi.scanInbound({
        tracking_code: cleanCode,
        package_condition: condition,
        hub_measured_weight: hubMeasuredWeight,
        client_offline_id: clientOfflineId,
      });

      const resData = res.data || {
        current_status: 'IN_HUB_ORIGIN',
        next_action: 'SORT_FOR_TRANSIT',
        is_flagged: condition !== 'INTACT',
      };

      const newLog: ScanItemLog = {
        id: `${Date.now()}-${Math.random()}`,
        tracking_code: cleanCode,
        status: resData.current_status,
        next_action: resData.next_action,
        is_flagged: resData.is_flagged || condition !== 'INTACT',
        time: new Date().toLocaleTimeString('vi-VN'),
        isSuccess: true,
        weightDiscrepancyGram: resData.weight_discrepancy_gram ?? null,
        zoneId: resData.zone_id ?? null,
        needsManualRouting: resData.needs_manual_routing ?? false,
      };

      setScanLogs((prev) => [newLog, ...prev]);
      setStats((prev) => ({ ...prev, total: prev.total + 1, success: prev.success + 1 }));

      if (condition !== 'INTACT') {
        setLastScannedForIncident(cleanCode);
      }
    } catch (err: any) {
      if (err.isOfflineQueued) {
        const offlineLog: ScanItemLog = {
          id: `${Date.now()}-${Math.random()}`,
          tracking_code: cleanCode,
          status: 'OFFLINE_QUEUED',
          next_action: 'PENDING_SYNC',
          is_flagged: false,
          time: new Date().toLocaleTimeString('vi-VN'),
          isSuccess: false,
          errorMessage: '📵 Đã lưu hàng đợi offline — sẽ tự đồng bộ khi có mạng',
        };
        setScanLogs((prev) => [offlineLog, ...prev]);
        setStats((prev) => ({ ...prev, total: prev.total + 1 }));
        return;
      }

      const errMsg = err.response?.data?.message || 'Lỗi quét kiện hàng (Xung đột hoặc Mã không hợp lệ)';
      const errCode = err.response?.data?.code;

      // Nhận diện lỗi quét trùng (Đã nhập kho rồi)
      const isDuplicate = errCode === 'INVALID_STATE_TRANSITION' && errMsg.includes('không hợp lệ để nhập kho tại Hub này');

      if (isDuplicate) {
        toast.warning(`Mã ${cleanCode} đã nằm trong kho (Quét trùng)!`);
        return; // Không ghi nhận vào bảng log làm lãng phí data
      }

      const failedLog: ScanItemLog = {
        id: `${Date.now()}-${Math.random()}`,
        tracking_code: cleanCode,
        status: 'FAILED',
        next_action: 'HOLD',
        is_flagged: true,
        time: new Date().toLocaleTimeString('vi-VN'),
        isSuccess: false,
        errorMessage: errMsg,
      };
      setScanLogs((prev) => [failedLog, ...prev]);
      setStats((prev) => ({ ...prev, total: prev.total + 1, failed: prev.failed + 1 }));
    }
  };

  const executeSealScan = async (sealCode: string, clientOfflineId: string) => {
    try {
      const res = await warehouseApi.scanSealInbound({
        seal_code: sealCode,
        client_offline_id: clientOfflineId,
      });

      const { total, success_count, failed_count, failed_items } = res.data;

      const sealSummaryLog: ScanItemLog = {
        id: `seal-${Date.now()}`,
        tracking_code: `[SEAL] ${sealCode}`,
        status: failed_count === 0 ? 'ALL_IN_HUB' : 'PARTIAL',
        next_action: `${success_count}/${total} thành công`,
        is_flagged: failed_count > 0,
        time: new Date().toLocaleTimeString('vi-VN'),
        isSuccess: failed_count === 0,
        errorMessage: failed_count > 0 ? `${failed_count} kiện thất bại` : undefined,
      };

      const failLogs: ScanItemLog[] = failed_items.map((f, i) => ({
        id: `seal-fail-${Date.now()}-${i}`,
        tracking_code: f.tracking_code,
        status: 'FAILED',
        next_action: 'HOLD',
        is_flagged: true,
        time: new Date().toLocaleTimeString('vi-VN'),
        isSuccess: false,
        errorMessage: f.reason,
      }));

      setScanLogs((prev) => [...failLogs, sealSummaryLog, ...prev]);
      setStats((prev) => ({
        total:   prev.total   + total,
        success: prev.success + success_count,
        failed:  prev.failed  + failed_count,
      }));
    } catch (err: any) {
      const errMsg = err.response?.data?.message || `Lỗi quét Seal ${sealCode}`;
      const failedLog: ScanItemLog = {
        id: `seal-err-${Date.now()}`,
        tracking_code: `[SEAL] ${sealCode}`,
        status: 'FAILED',
        next_action: 'HOLD',
        is_flagged: true,
        time: new Date().toLocaleTimeString('vi-VN'),
        isSuccess: false,
        errorMessage: errMsg,
      };
      setScanLogs((prev) => [failedLog, ...prev]);
      setStats((prev) => ({ ...prev, total: prev.total + 1, failed: prev.failed + 1 }));
    }
  };

  // ─── Incident report handler ─────────────────────────────────────────────────

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setIncidentPhotos((prev) => [...prev, ...urls].slice(0, 10));
  };

  const handleSendIncident = async () => {
    if (!lastScannedForIncident) return;
    setIncidentSending(true);
    try {
      await warehouseApi.reportIncident({
        tracking_code: lastScannedForIncident,
        photo_urls: incidentPhotos,
        note: incidentNote,
      });
      setIncidentPhotos([]);
      setIncidentNote('');
      setLastScannedForIncident(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi gửi báo cáo sự cố');
    } finally {
      setIncidentSending(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" onClick={handleContainerClick}>
      {/* ── Header & Thống kê ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-cyan-400">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">
                Quét Nhập Kho &amp; Phân Luồng (UC-16 Inbound)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Luồng chính: Camera QR — nhập tay là dự phòng khi mã bị mờ/rách
              </p>
            </div>
          </div>
        </div>

        {/* Offline indicator + Live Counters */}
        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
          <div
            className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-700/40'
                : 'bg-rose-950/40 text-rose-400 border-rose-700/40'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline — hàng đợi đang hoạt động'}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử quét trong phiên này?')) {
                  setScanLogs([]);
                  setStats({ total: 0, success: 0, failed: 0 });
                }
              }}
              className="text-xs text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/20 px-3 py-2 rounded-xl transition font-bold"
            >
              Làm mới ca làm việc
            </button>
            <div className="text-center px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Tổng</p>
              <p className="text-xl font-black text-slate-100">{stats.total}</p>
            </div>
            <div className="flex-1 md:flex-initial text-center px-5 py-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
              <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Thành công
              </p>
              <p className="text-xl font-black text-emerald-300">{stats.success}</p>
            </div>
            <div className="flex-1 md:flex-initial text-center px-5 py-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl">
              <p className="text-[10px] text-rose-400 uppercase font-bold tracking-wider flex items-center justify-center gap-1">
                <XCircle className="w-3 h-3" /> Lỗi / Ngoại lệ
              </p>
              <p className="text-xl font-black text-rose-300">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Control Panel ── */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">

        {/* Mode toggle: Đơn lẻ / Theo Seal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <PackageSearch className="w-4 h-4 text-cyan-400" />
            Chế độ quét
          </span>
          <button
            type="button"
            onClick={() => setScanMode((m) => (m === 'single' ? 'seal' : 'single'))}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer select-none"
          >
            {scanMode === 'single' ? (
              <>
                <ToggleLeft className="w-5 h-5 text-slate-400" />
                <span>Đơn lẻ</span>
              </>
            ) : (
              <>
                <ToggleRight className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-300">Theo Seal (Bao tải)</span>
              </>
            )}
          </button>
        </div>

        {/* ── LUỒNG CHÍNH: Camera QR (UC-16 § 3.1) ── */}
        <CameraScanner
          onScanSuccess={executeInboundScan}
          isScanning={isCameraActive}
          onToggleScan={setIsCameraActive}
        />

        {/* ── DỰ PHÒNG: Nhập tay — ẩn mặc định, hiện khi camera không dùng được ── */}
        <div>
          <button
            type="button"
            onClick={() => setShowManualInput((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer select-none"
          >
            <Keyboard className="w-3.5 h-3.5" />
            Không quét được? Nhập mã thủ công
            {showManualInput
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showManualInput && (
            <div className="mt-3 flex flex-col md:flex-row gap-4 items-stretch md:items-start animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Barcode input */}
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-cyan-400" />
                  {scanMode === 'seal'
                    ? 'Nhập mã Seal bao tải (Enter):'
                    : 'Nhập mã vận đơn (Súng Barcode USB & Enter):'}
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      scanMode === 'seal'
                        ? 'Nhập mã Seal bao tải...'
                        : 'Nhập hoặc bóp cò súng quét...'
                    }
                    className="w-full text-lg font-mono border-2 border-blue-500/80 rounded-xl px-4 py-3.5 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-cyan-400 transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-400 bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/30">
                    {scanMode === 'seal' ? 'SEAL MODE' : 'MANUAL'}
                  </span>
                </div>
              </div>

              {/* Condition + Weight (chỉ hiện trong chế độ đơn lẻ) */}
              {scanMode === 'single' && (
                <div className="flex flex-col gap-3 w-full md:w-72">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Tình trạng ngoại quan kiện hàng:
                    </label>
                    <select
                      value={condition}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e: any) => {
                        setCondition(e.target.value);
                        if (e.target.value === 'INTACT') {
                          setLastScannedForIncident(null);
                          setIncidentPhotos([]);
                          setIncidentNote('');
                        }
                      }}
                      className="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-950 text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="INTACT">✅ Nguyên vẹn (Bình thường)</option>
                      <option value="DAMAGED">⚠️ Hư hỏng / Móp méo</option>
                      <option value="TORN_SEAL">❌ Rách niêm phong</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-slate-400" />
                      Cân lại tại kho (kg, tuỳ chọn):
                    </label>
                    <input
                      ref={weightInputRef}
                      type="number"
                      min="0"
                      step="0.01"
                      value={hubWeight}
                      onChange={(e) => setHubWeight(e.target.value)}
                      placeholder="VD: 1.25"
                      className="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-950 text-slate-200 font-mono focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Condition selector khi đang dùng Camera (vẫn hiện để chọn tình trạng trước khi quét) */}
        {!showManualInput && scanMode === 'single' && (
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tình trạng ngoại quan kiện hàng:
              </label>
              <select
                value={condition}
                onClick={(e) => e.stopPropagation()}
                onChange={(e: any) => {
                  setCondition(e.target.value);
                  if (e.target.value === 'INTACT') {
                    setLastScannedForIncident(null);
                    setIncidentPhotos([]);
                    setIncidentNote('');
                  }
                }}
                className="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-950 text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="INTACT">✅ Nguyên vẹn (Bình thường)</option>
                <option value="DAMAGED">⚠️ Hư hỏng / Móp méo</option>
                <option value="TORN_SEAL">❌ Rách niêm phong</option>
              </select>
            </div>
            <div className="flex-1 sm:max-w-[200px]">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                Cân lại tại kho (kg, tuỳ chọn):
              </label>
              <input
                ref={weightInputRef}
                type="number"
                min="0"
                step="0.01"
                value={hubWeight}
                onChange={(e) => setHubWeight(e.target.value)}
                placeholder="VD: 1.25"
                className="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-950 text-slate-200 font-mono focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Cảnh báo tình trạng hư hỏng */}
        {condition !== 'INTACT' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Cảnh báo: Kiện hàng được chọn tình trạng <strong>{condition}</strong>. Hệ thống sẽ dán cờ{' '}
              <strong>is_flagged = true</strong> và chuyển luồng xử lý sang khu vực kiểm tra ngoại lệ!
            </span>
          </div>
        )}
      </div>

      {/* ── Incident Report Panel ── */}
      {condition !== 'INTACT' && lastScannedForIncident && (
        <div className="bg-rose-950/20 border border-rose-700/40 p-5 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Báo cáo sự cố — Kiện hàng:{' '}
            <span className="font-mono text-white">{lastScannedForIncident}</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ảnh bằng chứng hư hỏng (tối đa 10 ảnh):
            </label>
            <input
              ref={photoInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              onClick={(e) => e.stopPropagation()}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-slate-600 file:bg-slate-800 file:text-slate-200 file:cursor-pointer hover:file:bg-slate-700 cursor-pointer"
            />
            {incidentPhotos.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {incidentPhotos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`proof-${i}`}
                    className="w-16 h-16 rounded-lg object-cover border border-slate-700"
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ghi chú sự cố:</label>
            <textarea
              value={incidentNote}
              onChange={(e) => setIncidentNote(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              rows={2}
              placeholder="Mô tả tình trạng hư hỏng..."
              className="w-full text-xs bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <button
            type="button"
            disabled={incidentSending}
            onClick={handleSendIncident}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs cursor-pointer transition"
          >
            <Send className="w-3.5 h-3.5" />
            {incidentSending ? 'Đang gửi...' : 'Gửi báo cáo sự cố'}
          </button>
        </div>
      )}

      {/* ── Bảng Log Lịch Sử Quét Realtime ── */}
      <InboundLogTable logs={scanLogs} />
    </div>
  );
};

export default WarehouseInboundPage;
