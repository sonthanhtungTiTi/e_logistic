import React, { useState, useRef, useEffect, useCallback } from 'react';
import { auditApi } from '@/api/audit.api';
import {
  ClipboardList, Barcode, CheckCircle2, XCircle, AlertTriangle,
  Play, Pause, Send, RotateCcw, PackageSearch, PackageX, PackageCheck,
  Keyboard, ChevronDown, ChevronUp
} from 'lucide-react';
import { CameraScanner } from '@/components/driver/CameraScanner';
import { useLocalStorage } from '@/hooks/useLocalStorage';

function generateOfflineId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type AuditPhase = 'IDLE' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';

interface ScanLogEntry {
  id: string;
  code: string;
  ok: boolean;
  msg: string;
  time: string;
}

interface AuditResult {
  matchedCount: number;
  missingCount: number;
  surplusCount: number;
  missingCodes: string[];
  surplusCodes: string[];
}

export const WarehouseAuditPage: React.FC = () => {
  // ── Session state ────────────────────────────────────────────────────────
  const [phase, setPhase]               = useLocalStorage<AuditPhase>('audit_phase', 'IDLE');
  const [sessionCode, setSessionCode]   = useLocalStorage<string>('audit_sessionCode', '');
  const [snapshotCount, setSnapshotCount] = useLocalStorage<number>('audit_snapshotCount', 0);
  const [startedAt, setStartedAt]       = useLocalStorage<string>('audit_startedAt', '');
  const [totalScanned, setTotalScanned] = useLocalStorage<number>('audit_totalScanned', 0);

  // ── Input state ──────────────────────────────────────────────────────────
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [loading, setLoading]           = useState<boolean>(false);
  const [statusMsg, setStatusMsg]       = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // ── Scan log (chỉ hiện cho UX, không hiện snapshot) ─────────────────────
  const [scanLog, setScanLog]           = useLocalStorage<ScanLogEntry[]>('audit_scanLog', []);

  // ── Final result ─────────────────────────────────────────────────────────
  const [result, setResult]             = useLocalStorage<AuditResult | null>('audit_result', null);

  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === 'IN_PROGRESS') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase]);

  // ── Start audit ──────────────────────────────────────────────────────────
  const handleStart = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await auditApi.startAudit({ scope_type: 'ALL' });
      setSessionCode(res.data.session_code);
      setSnapshotCount(res.data.snapshot_count);
      setStartedAt(new Date(res.data.started_at).toLocaleTimeString('vi-VN'));
      setTotalScanned(0);
      setScanLog([]);
      setResult(null);
      setPhase('IN_PROGRESS');
      setStatusMsg({ type: 'success', text: `Phiên kiểm kê [${res.data.session_code}] bắt đầu — ${res.data.snapshot_count} kiện trong snapshot` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi tạo phiên kiểm kê' });
    } finally {
      setLoading(false);
    }
  };

  // ── Scan single item ─────────────────────────────────────────────────────
  const executeScan = useCallback(async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code || !sessionCode || phase !== 'IN_PROGRESS') return;
    setBarcodeInput('');
    inputRef.current?.focus();

    const offlineId = generateOfflineId();
    try {
      const res = await auditApi.syncAudit({
        session_code: sessionCode,
        tracking_codes: [code],
        client_offline_id: offlineId,
        is_final_sync: false,
      });
      const d = res.data;
      const isDup = d.skipped_duplicate > 0;
      setTotalScanned(d.total_scanned);
      setScanLog(prev => [{
        id: `${Date.now()}-${Math.random()}`,
        code,
        ok: true,
        msg: isDup ? '⚠ Trùng (bỏ qua)' : '✓ Đã ghi nhận',
        time: new Date().toLocaleTimeString('vi-VN'),
      }, ...prev.slice(0, 49)]);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Lỗi sync';
      setScanLog(prev => [{
        id: `${Date.now()}-${Math.random()}`,
        code, ok: false, msg: `✗ ${errMsg}`,
        time: new Date().toLocaleTimeString('vi-VN'),
      }, ...prev.slice(0, 49)]);
    }
  }, [sessionCode, phase]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); executeScan(barcodeInput); }
  }, [barcodeInput, executeScan]);

  // ── Pause / Resume ───────────────────────────────────────────────────────
  const handlePause = async () => {
    if (!sessionCode) return;
    try {
      await auditApi.pauseAudit(sessionCode);
      setPhase('PAUSED');
      setStatusMsg({ type: 'info', text: 'Phiên kiểm kê đã tạm dừng' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi tạm dừng' });
    }
  };

  const handleResume = async () => {
    if (!sessionCode) return;
    try {
      await auditApi.resumeAudit(sessionCode);
      setPhase('IN_PROGRESS');
      setStatusMsg({ type: 'success', text: 'Phiên kiểm kê tiếp tục' });
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi tiếp tục' });
    }
  };

  // ── Final submit ─────────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!sessionCode || loading) return;
    if (!window.confirm(`Hoàn tất kiểm kê phiên [${sessionCode}]?\nHàng thiếu sẽ chuyển SEARCH_ZONE, hàng dư sẽ chuyển SURPLUS.`)) return;
    setLoading(true);
    try {
      const res = await auditApi.submitAudit(sessionCode);
      const d = res.data;
      setResult({
        matchedCount:  d.matched_count  ?? d.matchedCount  ?? 0,
        missingCount:  d.missing_count  ?? d.missingCount  ?? 0,
        surplusCount:  d.surplus_count  ?? d.surplusCount  ?? 0,
        missingCodes:  d.missing_tracking_codes ?? [],
        surplusCodes:  d.surplus_tracking_codes ?? [],
      });
      setPhase('COMPLETED');
      setStatusMsg({ type: 'success', text: 'Phiên kiểm kê hoàn tất — chờ phê duyệt' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi hoàn tất kiểm kê' });
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('Bạn có chắc muốn xóa dữ liệu phiên kiểm kê này?')) return;
    setPhase('IDLE'); setSessionCode(''); setSnapshotCount(0);
    setTotalScanned(0); setScanLog([]); setResult(null); setStatusMsg(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl text-violet-400">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Kiểm Kê Kho (UC-18 Audit)</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {sessionCode
                ? `Phiên: ${sessionCode} · Bắt đầu ${startedAt} · Snapshot ${snapshotCount} kiện`
                : 'Nhấn Bắt đầu để tạo phiên kiểm kê mới'}
            </p>
          </div>
        </div>
        {/* Stats strip */}
        <div className="flex gap-3">
          <div className="text-center px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Snapshot</p>
            <p className="text-xl font-black text-slate-100">{snapshotCount}</p>
          </div>
          <div className="text-center px-4 py-2 bg-violet-950/40 border border-violet-800/60 rounded-xl">
            <p className="text-[10px] text-violet-400 uppercase font-bold">Đã quét</p>
            <p className="text-xl font-black text-violet-300">{totalScanned}</p>
          </div>
        </div>
      </div>

      {/* ── IDLE: Start panel ── */}
      {phase === 'IDLE' && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl text-center space-y-4">
          <ClipboardList className="w-14 h-14 text-violet-400 mx-auto opacity-60" />
          <h2 className="text-lg font-bold text-slate-200">Bắt đầu phiên kiểm kê kho</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Hệ thống sẽ chụp snapshot toàn bộ kiện hàng đang tồn kho tại Hub của bạn (scope ALL).
            Sau đó bạn quét từng kiện — hệ thống tự tính khớp / thiếu / dư.
          </p>
          <button
            onClick={handleStart}
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition cursor-pointer shadow-lg shadow-violet-600/20"
          >
            <Play className="w-4 h-4" />
            {loading ? 'Đang tạo phiên...' : 'Bắt đầu Kiểm kê'}
          </button>
        </div>
      )}

      {/* ── IN_PROGRESS / PAUSED: Scan panel ── */}
      {(phase === 'IN_PROGRESS' || phase === 'PAUSED') && (
        <>
          {/* Scan input */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            {/* LUỒNG CHÍNH: Camera Barcode & QR */}
            <CameraScanner
              onScanSuccess={executeScan}
              isScanning={isCameraActive}
              onToggleScan={setIsCameraActive}
              title="Camera Quét Mã Kiện Hàng Kiểm Kê (UC-18)"
              subtitle="Hỗ trợ tự động: Barcode 1D (Code 128, Code 39, EAN) & QR Code"
            />

            {/* DỰ PHÒNG: Nhập tay / Súng quét USB */}
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
                Không quét được? Nhập mã thủ công
                {showManualInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showManualInput && (
                <div className="relative mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-violet-400" />
                    {phase === 'IN_PROGRESS' ? 'Bắn mã vạch kiện hàng (Súng USB & Enter):' : '⏸ Phiên đang tạm dừng'}
                  </label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={barcodeInput}
                      onChange={e => setBarcodeInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={phase === 'PAUSED'}
                      placeholder={phase === 'IN_PROGRESS' ? 'Quét hoặc nhập mã vận đơn...' : 'Đang tạm dừng...'}
                      className="w-full text-lg font-mono border-2 border-violet-500/80 rounded-xl px-4 py-3.5 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-violet-500/30 focus:border-violet-400 transition disabled:opacity-40"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-400 bg-violet-500/20 px-2.5 py-1 rounded-lg border border-violet-500/30">
                      AUDIT
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            {phase === 'IN_PROGRESS' ? (
              <button onClick={handlePause}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                <Pause className="w-3.5 h-3.5" /> Tạm dừng
              </button>
            ) : (
              <button onClick={handleResume}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                <Play className="w-3.5 h-3.5" /> Tiếp tục
              </button>
            )}
            <button
              onClick={handleFinish}
              disabled={loading || totalScanned === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Đang tính...' : 'Hoàn tất & Nộp kết quả'}
            </button>
            <button onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" /> Huỷ phiên
            </button>
          </div>

          {/* Scan log — chỉ hiện code đã quét, KHÔNG hiện snapshotTrackingCodes */}
          {scanLog.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-violet-400" />
                  Lịch sử quét ({totalScanned} tổng)
                </h2>
                <span className="text-[11px] text-slate-400">50 gần nhất</span>
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
                    {scanLog.map(log => (
                      <tr key={log.id} className={`transition ${log.ok ? 'hover:bg-slate-800/30' : 'bg-rose-950/20'}`}>
                        <td className="py-2.5 px-4 text-xs font-mono text-slate-400">{log.time}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-violet-400">{log.code}</td>
                        <td className={`py-2.5 px-4 text-xs font-bold ${log.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{log.msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── COMPLETED: Result report ── */}
      {phase === 'COMPLETED' && result && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-950/30 border border-emerald-700/40 p-5 rounded-2xl text-center">
              <PackageCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Khớp</p>
              <p className="text-3xl font-black text-emerald-300">{result.matchedCount}</p>
            </div>
            <div className="bg-amber-950/30 border border-amber-700/40 p-5 rounded-2xl text-center">
              <PackageSearch className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-[10px] text-amber-400 uppercase font-bold mb-1">Thiếu → SEARCH_ZONE</p>
              <p className="text-3xl font-black text-amber-300">{result.missingCount}</p>
            </div>
            <div className="bg-violet-950/30 border border-violet-700/40 p-5 rounded-2xl text-center">
              <PackageX className="w-8 h-8 text-violet-400 mx-auto mb-2" />
              <p className="text-[10px] text-violet-400 uppercase font-bold mb-1">Dư → SURPLUS</p>
              <p className="text-3xl font-black text-violet-300">{result.surplusCount}</p>
            </div>
          </div>

          {/* Missing list */}
          {result.missingCodes.length > 0 && (
            <div className="bg-slate-900 border border-amber-800/30 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-800/30 bg-amber-950/20">
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <PackageSearch className="w-4 h-4" /> Hàng thiếu ({result.missingCount}) — đã chuyển SEARCH_ZONE
                </h3>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {result.missingCodes.map(c => (
                  <span key={c} className="font-mono text-xs px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* Surplus list */}
          {result.surplusCodes.length > 0 && (
            <div className="bg-slate-900 border border-violet-800/30 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-violet-800/30 bg-violet-950/20">
                <h3 className="text-sm font-bold text-violet-300 flex items-center gap-2">
                  <PackageX className="w-4 h-4" /> Hàng dư ({result.surplusCount}) — đã chuyển SURPLUS
                </h3>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {result.surplusCodes.map(c => (
                  <span key={c} className="font-mono text-xs px-2 py-1 bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-lg">{c}</span>
                ))}
              </div>
              <div className="px-5 pb-4">
                <p className="text-[11px] text-slate-400">
                  💡 Hàng dư: nhân viên gọi <code className="text-violet-300 bg-violet-900/30 px-1 rounded">/api/inbound/scan-single</code> để nhập kho lại bình thường.
                </p>
              </div>
            </div>
          )}

          {/* New session button */}
          <button onClick={handleReset}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Bắt đầu phiên kiểm kê mới
          </button>
        </div>
      )}

      {/* Status message */}
      {statusMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 border shadow-md ${
          statusMsg.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
          : statusMsg.type === 'error' ? 'bg-rose-950/80 text-rose-300 border-rose-800'
          : 'bg-blue-950/80 text-blue-300 border-blue-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
           : statusMsg.type === 'error'  ? <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
           : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
};

export default WarehouseAuditPage;
