import React, { useState, useRef, useEffect, useCallback } from 'react';
import { outboundApi } from '@/api/outbound.api';
import { Barcode, CheckCircle2, XCircle, Package, AlertTriangle, Truck, PackageX } from 'lucide-react';

function generateOfflineId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface ScanLog {
  id: string;
  tracking_code: string;
  is_success: boolean;
  is_duplicate: boolean;
  message: string;
  time: string;
}

export const WarehouseOutboundPage: React.FC = () => {
  const [tripCode, setTripCode] = useState<string>('');
  const [activeTripCode, setActiveTripCode] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, duplicate: 0 });
  const [isShortage, setIsShortage] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);
  const [isTripActive, setIsTripActive] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const tripInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { tripInputRef.current?.focus(); }, []);

  const activateTrip = () => {
    const code = tripCode.trim().toUpperCase();
    if (!code) return;
    setActiveTripCode(code);
    setIsTripActive(true);
    setScanLogs([]);
    setStats({ total: 0, success: 0, failed: 0, duplicate: 0 });
    setCommitResult(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDownTrip = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') activateTrip();
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeScan(barcodeInput);
    }
  }, [barcodeInput, activeTripCode]); // eslint-disable-line react-hooks/exhaustive-deps

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
        client_offline_id: offlineId,
      });
      const isDup = res.data?.already_scanned || false;
      const log: ScanLog = {
        id: `${Date.now()}-${Math.random()}`,
        tracking_code: cleanCode,
        is_success: true, is_duplicate: isDup,
        message: res.data?.message || 'OK',
        time: new Date().toLocaleTimeString('vi-VN'),
      };
      setScanLogs(prev => [log, ...prev]);
      setStats(prev => ({ ...prev, total: prev.total + 1, success: prev.success + 1, duplicate: prev.duplicate + (isDup ? 1 : 0) }));
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Lỗi quét xuất kho';
      const log: ScanLog = {
        id: `${Date.now()}-${Math.random()}`,
        tracking_code: cleanCode,
        is_success: false, is_duplicate: false,
        message: errMsg,
        time: new Date().toLocaleTimeString('vi-VN'),
      };
      setScanLogs(prev => [log, ...prev]);
      setStats(prev => ({ ...prev, total: prev.total + 1, failed: prev.failed + 1 }));
    }
  };

  const handleCommit = async () => {
    if (!activeTripCode) return;
    setCommitting(true);
    try {
      const res = await outboundApi.commitTrip({ trip_code: activeTripCode, is_shortage: isShortage });
      setCommitResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi commit chuyến xe');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-orange-600/20 border border-orange-500/30 rounded-xl text-orange-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Quét Xuất Kho (UC-17 Outbound)</h1>
            <p className="text-xs text-slate-400 mt-0.5">Xuất kho theo Chuyến xe — Barcode USB / Quét thủ công</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="text-center px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Tổng</p>
            <p className="text-xl font-black text-slate-100">{stats.total}</p>
          </div>
          <div className="text-center px-4 py-2 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
            <p className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />OK</p>
            <p className="text-xl font-black text-emerald-300">{stats.success}</p>
          </div>
          <div className="text-center px-4 py-2 bg-rose-950/40 border border-rose-800/60 rounded-xl">
            <p className="text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1"><XCircle className="w-3 h-3" />Lỗi</p>
            <p className="text-xl font-black text-rose-300">{stats.failed}</p>
          </div>
        </div>
      </div>

      {/* Trip Selection */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
        <label className="block text-xs font-semibold text-slate-300 mb-1">Mã chuyến xe (Trip Code):</label>
        <div className="flex gap-3">
          <input
            ref={tripInputRef}
            type="text"
            value={tripCode}
            onChange={e => setTripCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDownTrip}
            placeholder="VD: TRIP-1786780...-XXXX"
            disabled={isTripActive}
            className="flex-1 font-mono text-sm border border-slate-700 rounded-xl px-4 py-3 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500 disabled:opacity-50"
          />
          {!isTripActive ? (
            <button onClick={activateTrip} className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition cursor-pointer">
              Kích hoạt
            </button>
          ) : (
            <button onClick={() => { setIsTripActive(false); setActiveTripCode(''); setTripCode(''); }}
              className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition cursor-pointer">
              Đổi Trip
            </button>
          )}
        </div>
        {isTripActive && (
          <div className="flex items-center gap-2 text-xs font-bold text-orange-300 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-xl">
            <Truck className="w-3.5 h-3.5" />
            Đang xuất kho cho chuyến: <span className="font-mono text-white">{activeTripCode}</span>
          </div>
        )}
      </div>

      {/* Scan Input */}
      {isTripActive && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Barcode className="w-4 h-4 text-orange-400" />
            Bắn mã vạch kiện hàng xuất kho (Enter):
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Quét hoặc nhập mã vận đơn..."
              className="w-full text-lg font-mono border-2 border-orange-500/80 rounded-xl px-4 py-3.5 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-orange-500/30 focus:border-orange-400 transition"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-400 bg-orange-500/20 px-2.5 py-1 rounded-lg border border-orange-500/30">OUTBOUND</span>
          </div>
        </div>
      )}

      {/* Commit Panel */}
      {isTripActive && !commitResult && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-400" />
            Xác nhận và Khóa chuyến xe
          </h3>
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
            <input type="checkbox" checked={isShortage} onChange={e => setIsShortage(e.target.checked)}
              className="w-4 h-4 accent-orange-500 cursor-pointer" />
            <PackageX className="w-3.5 h-3.5 text-orange-400" />
            Có hàng thiếu (Shortage) — các kiện chưa quét sẽ chuyển SEARCH_ZONE
          </label>
          <button
            onClick={handleCommit}
            disabled={committing || stats.success === 0}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition cursor-pointer"
          >
            {committing ? 'Đang khóa...' : `Khóa Chuyến Xe & Chờ Tài Xế Xác Nhận`}
          </button>
        </div>
      )}

      {/* Commit Result */}
      {commitResult && (
        <div className="bg-emerald-950/30 border border-emerald-700/40 p-5 rounded-2xl shadow-xl">
          <h3 className="text-sm font-bold text-emerald-300 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Chuyến xe đã được khóa
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-bold">ĐÃ QUÉT</p>
              <p className="text-2xl font-black text-white">{commitResult.scanned_count}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-orange-400 font-bold">SHORTAGE</p>
              <p className="text-2xl font-black text-orange-300">{commitResult.shortage_count}</p>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3">
              <p className="text-[10px] text-emerald-400 font-bold">TRẠNG THÁI</p>
              <p className="text-xs font-black text-emerald-300 mt-1">{commitResult.status?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Scan Log Table */}
      {scanLogs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Barcode className="w-4 h-4 text-orange-400" />
              Lịch sử quét xuất kho ({scanLogs.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Giờ</th>
                  <th className="py-3 px-4">Mã vận đơn</th>
                  <th className="py-3 px-4">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scanLogs.map(log => (
                  <tr key={log.id} className={`transition ${log.is_success ? 'hover:bg-slate-800/40' : 'bg-rose-950/20'}`}>
                    <td className="py-3 px-4 text-xs font-mono text-slate-400">{log.time}</td>
                    <td className="py-3 px-4 font-mono font-bold text-orange-400">{log.tracking_code}</td>
                    <td className="py-3 px-4 text-xs">
                      {log.is_success ? (
                        <span className={`font-bold ${log.is_duplicate ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {log.is_duplicate ? '⚠ Trùng (bỏ qua)' : '✓ Xuất kho'}
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold">✗ {log.message}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unused import suppressor */}
      <span className="hidden"><AlertTriangle /></span>
    </div>
  );
};

export default WarehouseOutboundPage;
