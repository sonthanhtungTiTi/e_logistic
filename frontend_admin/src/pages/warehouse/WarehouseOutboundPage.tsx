import React, { useState, useRef, useEffect, useCallback } from 'react';
import { outboundApi, type TripListItem } from '@/api/outbound.api';
import {
  Barcode,
  CheckCircle2,
  XCircle,
  Truck,
  RefreshCcw,
  Keyboard,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { CameraScanner } from '@/components/driver/CameraScanner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

function generateOfflineId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const HUBS_LIST = [
  { id: '6a8016bc2c43f32e6cd53dba', code: 'HUB_HAN_01', name: 'Kho Tổng Hà Nội (Miền Bắc)' },
  { id: '6a8016bc2c43f32e6cd53dbb', code: 'HUB_DAD_01', name: 'Kho Tổng Đà Nẵng (Miền Trung)' },
  { id: '6a8016bd2c43f32e6cd53dbc', code: 'HUB_SGN_01', name: 'Kho Tổng TP.HCM (Miền Nam)' },
  { id: '6a8016bd2c43f32e6cd53dbd', code: 'HUB_HPH_01', name: 'Bưu cục Hải Phòng' },
  { id: '6a8016be2c43f32e6cd53dbe', code: 'HUB_VCA_01', name: 'Bưu cục Cần Thơ' },
];

interface ScanLog {
  id: string;
  tracking_code: string;
  is_success: boolean;
  is_duplicate: boolean;
  message: string;
  time: string;
}

export const WarehouseOutboundPage: React.FC = () => {
  const [tripCode, setTripCode] = useLocalStorage('outbound_tripCode', '');
  const [activeTripCode, setActiveTripCode] = useLocalStorage('outbound_activeTripCode', '');
  const [isTripActive, setIsTripActive] = useLocalStorage('outbound_isTripActive', false);
  const [scanLogs, setScanLogs] = useLocalStorage<ScanLog[]>('outbound_scanLogs', []);
  const [stats, setStats] = useLocalStorage('outbound_stats', { total: 0, success: 0, failed: 0, duplicate: 0 });
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [isShortage, setIsShortage] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // Modal tạo chuyến xe mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [destHubId, setDestHubId] = useState(HUBS_LIST[0].id);
  const [tripType, setTripType] = useState<'MID_MILE_TRANSFER' | 'LAST_MILE_DELIVERY'>('MID_MILE_TRANSFER');
  const [plannedInput, setPlannedInput] = useState('');
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [recentTrips, setRecentTrips] = useState<TripListItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const tripInputRef = useRef<HTMLInputElement>(null);

  const loadRecentTrips = useCallback(async () => {
    try {
      const res = await outboundApi.getTrips();
      setRecentTrips(res.data || []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    tripInputRef.current?.focus();
    loadRecentTrips();
  }, [loadRecentTrips]);

  const activateTrip = (codeToActivate?: string) => {
    const code = (codeToActivate || tripCode).trim().toUpperCase();
    if (!code) {
      toast.error('Vui lòng nhập hoặc chọn mã chuyến xe!');
      return;
    }
    setTripCode(code);
    setActiveTripCode(code);
    setIsTripActive(true);
    setScanLogs([]);
    setStats({ total: 0, success: 0, failed: 0, duplicate: 0 });
    setCommitResult(null);
    toast.success(`Đã kích hoạt chuyến xe ${code}! Sẵn sàng quét hàng.`);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDownTrip = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') activateTrip();
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeScan(barcodeInput);
      }
    },
    [barcodeInput, activeTripCode] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const executeScan = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !activeTripCode) return;
    setBarcodeInput('');
    inputRef.current?.focus();

    const offlineId = generateOfflineId();
    try {
      const res = await outboundApi.scanOutbound({
        trip_code: activeTripCode,
        tracking_code: cleanCode,
        seal_code: cleanCode.startsWith('SEAL-') ? cleanCode : undefined,
        client_offline_id: offlineId,
      });
      const isDup = res.data?.already_scanned || false;
      const log: ScanLog = {
        id: `${Date.now()}-${Math.random()}`,
        tracking_code: cleanCode,
        is_success: true,
        is_duplicate: isDup,
        message: res.data?.message || 'OK',
        time: new Date().toLocaleTimeString('vi-VN'),
      };
      setScanLogs((prev) => [log, ...prev]);
      setStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        success: prev.success + 1,
        duplicate: prev.duplicate + (isDup ? 1 : 0),
      }));
      toast.success(`✅ Quét thành công: ${cleanCode}`);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Lỗi quét xuất kho';
      const log: ScanLog = {
        id: `${Date.now()}-${Math.random()}`,
        tracking_code: cleanCode,
        is_success: false,
        is_duplicate: false,
        message: errMsg,
        time: new Date().toLocaleTimeString('vi-VN'),
      };
      setScanLogs((prev) => [log, ...prev]);
      setStats((prev) => ({ ...prev, total: prev.total + 1, failed: prev.failed + 1 }));
      toast.error(`❌ ${errMsg}`);
    }
  };

  const handleCommit = async () => {
    if (!activeTripCode) return;
    setCommitting(true);
    try {
      const res = await outboundApi.commitTrip({ trip_code: activeTripCode, is_shortage: isShortage });
      setCommitResult(res.data);
      toast.success(`Chuyến xe ${activeTripCode} đã khóa và chờ tài xế xác nhận!`);
      loadRecentTrips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi commit chuyến xe');
    } finally {
      setCommitting(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const codes = plannedInput
      .split(/[\n,]+/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (codes.length === 0) {
      toast.error('Vui lòng nhập ít nhất 1 mã vận đơn dự kiến!');
      return;
    }

    setCreatingTrip(true);
    try {
      const res = await outboundApi.createTrip({
        trip_type: tripType,
        destination_hub_id: destHubId,
        planned_tracking_codes: codes,
      });

      const newTripCode = res.data.trip_code || res.data.tripCode;
      toast.success(`Tạo chuyến xe ${newTripCode} thành công!`);
      setShowCreateModal(false);
      setPlannedInput('');
      loadRecentTrips();
      activateTrip(newTripCode);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tạo chuyến xe');
    } finally {
      setCreatingTrip(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-orange-600/20 border border-orange-500/30 rounded-xl text-orange-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Quét Xuất Kho (UC-17 Outbound)</h1>
            <p className="text-xs text-slate-400 mt-0.5">Xuất kho theo Chuyến xe — Camera / Barcode USB / Quét Seal</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-orange-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tạo Chuyến Xe Mới
          </button>

          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn làm mới ca làm việc?')) {
                setScanLogs([]);
                setStats({ total: 0, success: 0, failed: 0, duplicate: 0 });
                setTripCode('');
                setActiveTripCode('');
                setIsTripActive(false);
              }
            }}
            className="text-xs text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/20 px-3 py-2 rounded-xl transition font-bold cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5 inline mr-1" />
            Làm mới
          </button>

          <div className="text-center px-3.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Tổng</p>
            <p className="text-lg font-black text-slate-100">{stats.total}</p>
          </div>
          <div className="text-center px-3.5 py-1.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
            <p className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              OK
            </p>
            <p className="text-lg font-black text-emerald-300">{stats.success}</p>
          </div>
          <div className="text-center px-3.5 py-1.5 bg-rose-950/40 border border-rose-800/60 rounded-xl">
            <p className="text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Lỗi
            </p>
            <p className="text-lg font-black text-rose-300">{stats.failed}</p>
          </div>
        </div>
      </div>

      {/* Trip Selection Area */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300">Mã chuyến xe (Trip Code):</label>
          {recentTrips.length > 0 && !isTripActive && (
            <span className="text-xs text-slate-500">Hoặc chọn chuyến gần đây bên dưới</span>
          )}
        </div>

        <div className="flex gap-3">
          <input
            ref={tripInputRef}
            type="text"
            value={tripCode}
            onChange={(e) => setTripCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDownTrip}
            placeholder="VD: TRIP-HPH-HAN-9042..."
            disabled={isTripActive}
            className="flex-1 font-mono text-sm border border-slate-700 rounded-xl px-4 py-3 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500 disabled:opacity-50"
          />
          {!isTripActive ? (
            <button
              onClick={() => activateTrip()}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow"
            >
              Kích hoạt
            </button>
          ) : (
            <button
              onClick={() => {
                setIsTripActive(false);
                setActiveTripCode('');
                setTripCode('');
              }}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Đổi Trip
            </button>
          )}
        </div>

        {/* Danh sách các chuyến xe gần đây để chọn nhanh */}
        {!isTripActive && recentTrips.length > 0 && (
          <div className="pt-2">
            <p className="text-[11px] text-slate-400 font-semibold mb-2">Chuyến xe sẵn sàng trong kho:</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
              {recentTrips.slice(0, 6).map((t) => (
                <button
                  key={t._id}
                  onClick={() => activateTrip(t.tripCode)}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-orange-950/40 border border-slate-800 hover:border-orange-500/50 rounded-lg text-xs font-mono text-slate-300 hover:text-orange-300 transition flex items-center gap-1.5"
                >
                  <Truck className="w-3 h-3 text-orange-400" />
                  <span className="font-bold">{t.tripCode}</span>
                  <span className="text-[10px] text-slate-500">({t.status})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isTripActive && (
          <div className="flex items-center gap-2 text-xs font-bold text-orange-300 bg-orange-500/10 border border-orange-500/20 px-3.5 py-2.5 rounded-xl">
            <Truck className="w-4 h-4 text-orange-400" />
            Đang quét xuất kho cho chuyến: <span className="font-mono text-white text-sm">{activeTripCode}</span>
          </div>
        )}
      </div>

      {/* Scan Input Area */}
      {isTripActive && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <CameraScanner
            onScanSuccess={executeScan}
            isScanning={isCameraActive}
            onToggleScan={setIsCameraActive}
            title="Camera Quét Mã Kiện Hàng & Mã Seal (UC-17)"
            subtitle="Tự động nhận diện Barcode 1D, QR Code và Seal Bao Tải"
          />

          <div>
            <button
              type="button"
              onClick={() => {
                setShowManualInput(!showManualInput);
                if (!showManualInput) setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer select-none"
            >
              <Keyboard className="w-3.5 h-3.5" />
              Không quét được? Nhập mã thủ công / Súng Barcode USB
              {showManualInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showManualInput && (
              <div className="relative mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-orange-400" />
                  Nhập mã vận đơn hoặc mã Seal (rồi Enter):
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Quét mã đơn / mã seal rồi bấm Enter..."
                    className="w-full text-lg font-mono border-2 border-orange-500/80 rounded-xl px-4 py-3.5 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-orange-500/30 focus:border-orange-400 transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-400 bg-orange-500/20 px-2.5 py-1 rounded-lg border border-orange-500/30">
                    OUTBOUND
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Commit Trip Section */}
      {isTripActive && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isShortage}
              onChange={(e) => setIsShortage(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-700 bg-slate-950"
            />
            <span>
              Ghi nhận hàng thiếu (Các đơn chưa quét sẽ tự động đưa vào <b className="text-orange-400">SEARCH_ZONE</b>)
            </span>
          </label>

          <button
            onClick={handleCommit}
            disabled={committing}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            {committing ? 'Đang chốt...' : 'Chốt Chuyến Xe (Commit Trip)'}
          </button>
        </div>
      )}

      {/* Commit Result */}
      {commitResult && (
        <div className="bg-emerald-950/30 border border-emerald-800/50 p-5 rounded-2xl shadow-xl space-y-2 animate-in fade-in duration-300">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Chuyến xe đã khóa thành công (LOCKED_PENDING_DRIVER_CONFIRM)!
          </h3>
          <p className="text-xs text-slate-300">
            Số kiện đã quét xuất: <b className="text-white">{commitResult.scanned_count}</b> | Số kiện thiếu:{' '}
            <b className="text-rose-400">{commitResult.shortage_count}</b>
          </p>
          {commitResult.shortage_codes?.length > 0 && (
            <p className="text-xs text-amber-300">
              Đơn thiếu chuyển vào SEARCH_ZONE: {commitResult.shortage_codes.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Scan Log History */}
      {isTripActive && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Nhật ký quét xuất kho ({scanLogs.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {scanLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">Chưa có kiện hàng nào được quét trong phiên này.</p>
            ) : (
              scanLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                    log.is_success
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {log.is_success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-mono font-bold text-white">{log.tracking_code}</span>
                    <span className="text-[11px] text-slate-400">· {log.message}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL TẠO CHUYẾN XE MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-500" />
                Tạo Chuyến Xe Mới (Outbound Trip)
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Loại chuyến xe:</label>
                <select
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="MID_MILE_TRANSFER">Trung chuyển liên kho (MID_MILE_TRANSFER)</option>
                  <option value="LAST_MILE_DELIVERY">Bàn giao phát hàng (LAST_MILE_DELIVERY)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Kho Đích Đến (Destination Hub):</label>
                <select
                  value={destHubId}
                  onChange={(e) => setDestHubId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                >
                  {HUBS_LIST.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Danh sách mã vận đơn dự kiến (Mỗi mã 1 dòng hoặc cách nhau dấu phẩy):
                </label>
                <textarea
                  rows={4}
                  value={plannedInput}
                  onChange={(e) => setPlannedInput(e.target.value)}
                  placeholder="VD: ELG-SG-HP-2702&#10;ELG-HP-HAN-01&#10;ELG-HP-HAN-02"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-orange-500 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingTrip}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {creatingTrip ? 'Đang tạo...' : 'Xác nhận Tạo Chuyến'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseOutboundPage;
