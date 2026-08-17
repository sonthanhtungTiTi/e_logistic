import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io as socketIO, Socket } from 'socket.io-client';
import { inventoryApi } from '@/api/inventory.api';
import type { AgingItem, SummaryData, MovementHistoryData, AgingStatus, InventoryActionType } from '@/api/inventory.api';
import {
  Package, AlertTriangle, XCircle, CheckCircle2, RefreshCcw,
  Download, History, Cpu, RotateCcw, Trash2, ChevronLeft, ChevronRight,
  Wifi, WifiOff, BarChart3, Map,
} from 'lucide-react';

// ── Aging badge ───────────────────────────────────────────────────────────────
function AgingBadge({ status }: { status: AgingStatus }) {
  const cls = {
    CRITICAL: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
    WARNING:  'bg-amber-500/20 border-amber-500/40 text-amber-300',
    NORMAL:   'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    ALL:      'bg-slate-500/20 border-slate-500/40 text-slate-300',
  }[status] || 'bg-slate-700 text-slate-400';
  return (
    <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase ${cls}`}>
      {status}
    </span>
  );
}

// ── Status chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const warnStatuses = ['SEARCH_ZONE','SUSPECTED_LOST','LOST','OVERDUE','SURPLUS'];
  const cls = warnStatuses.includes(status)
    ? 'bg-rose-950/60 text-rose-300 border-rose-700/50'
    : 'bg-slate-800 text-slate-300 border-slate-700';
  return <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold ${cls}`}>{status}</span>;
}

// ── Movement history panel ────────────────────────────────────────────────────
function MovementHistoryPanel({ trackingCode, onClose }: { trackingCode: string; onClose: () => void }) {
  const [history, setHistory] = useState<MovementHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi.getMovementHistory(trackingCode).then(r => { setHistory(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [trackingCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-violet-400" />
              Lịch sử: <span className="text-violet-300 font-mono">{trackingCode}</span>
            </h3>
            {history && (
              <p className="text-xs text-slate-400 mt-0.5">
                Hiện tại: <StatusChip status={history.current_status} /> · Dwell: {history.dwell_human} · <AgingBadge status={history.aging_status} />
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading && <p className="text-slate-400 text-sm text-center py-6">Đang tải...</p>}
          {!loading && history?.logs.length === 0 && <p className="text-slate-500 text-sm text-center py-6">Không có log nào.</p>}
          {history?.logs.map(log => (
            <div key={log._id} className="flex gap-3 items-start p-3 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition">
              <div className="w-1.5 h-1.5 mt-2 rounded-full bg-violet-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300">
                  <span className="font-mono text-slate-500">{log.preStatus}</span>
                  {' → '}
                  <span className="font-mono text-violet-300 font-bold">{log.postStatus}</span>
                  {' · '}
                  <span className="text-slate-400">{log.actionType}</span>
                </p>
                {log.note && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{log.note}</p>}
                <p className="text-[10px] text-slate-600 mt-0.5">{new Date(log.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Action menu ───────────────────────────────────────────────────────────────
function ActionMenu({
  item, onClose, onDone,
}: { item: AgingItem; onClose: () => void; onDone: (msg: string, ok: boolean) => void }) {
  const [action, setAction] = useState<InventoryActionType | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const doAction = async (type: InventoryActionType) => {
    setLoading(true);
    try {
      const res = await inventoryApi.performAction({
        tracking_code: item.tracking_code,
        action_type: type,
        reason: reason.trim() || undefined,
      });
      onDone(`✅ [${item.tracking_code}] → ${res.data.new_status}`, true);
      onClose();
    } catch (err: any) {
      onDone(`❌ ${err.response?.data?.message || 'Lỗi thực hiện action'}`, false);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-white">Hành động tồn kho</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 cursor-pointer"><XCircle className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-400">
          Kiện: <span className="font-mono text-violet-300 font-bold">{item.tracking_code}</span>
          <br />Trạng thái: <StatusChip status={item.status} /> · Dwell: {item.dwell_human}
        </p>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Lý do (tuỳ chọn)..."
          rows={2}
          className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 resize-none"
        />

        <div className="space-y-2">
          <button onClick={() => doAction('AI_REROUTE')} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer">
            <Cpu className="w-3.5 h-3.5" /> AI Reroute
          </button>
          <button onClick={() => doAction('RETURN')} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" /> Hoàn trả (RETURN)
          </button>
          <button onClick={() => doAction('LIQUIDATE')} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Thanh lý (LIQUIDATE)
          </button>
        </div>
        {loading && <p className="text-center text-xs text-slate-400 animate-pulse">Đang xử lý...</p>}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export const WarehouseInventoryDashboardPage: React.FC = () => {
  const [items, setItems]             = useState<AgingItem[]>([]);
  const [summary, setSummary]         = useState<SummaryData | null>(null);
  const [pagination, setPagination]   = useState({ total: 0, page: 1, limit: 20, total_pages: 1 });
  const [slaThresholds, setSlaThresholds] = useState({ warning_hours: 24, critical_hours: 48 });
  const [agingFilter, setAgingFilter] = useState<AgingStatus>('ALL');
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);
  const [actionTarget, setActionTarget]   = useState<AgingItem | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [agingRes, summaryRes] = await Promise.all([
        inventoryApi.getAging({ aging_status: agingFilter, page, limit: 20 }),
        inventoryApi.getSummary(),
      ]);
      setItems(agingRes.data.items);
      setPagination(agingRes.data.pagination as any);
      setSlaThresholds(agingRes.data.sla_thresholds);
      setSummary(summaryRes.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Lỗi tải dữ liệu', false);
    } finally {
      setLoading(false);
    }
  }, [agingFilter]);

  useEffect(() => { loadData(1); }, [loadData]);

  // ── Socket.IO realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = socketIO(backendUrl, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      setSocketConnected(true);
      // Join room dựa trên hubId của user (lấy từ localStorage/JWT context nếu có)
      // Tạm join 'ALL' cho demo
      socket.emit('join_warehouse_dashboard', 'ALL');
    });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('inventory:update', (payload: any) => {
      showToast(`🔄 Cập nhật realtime: [${payload.trackingCode}] → ${payload.newStatus}`, true);
      loadData(1);
    });
    return () => { socket.disconnect(); };
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const res = await inventoryApi.exportInventory({ aging_status: agingFilter });
      const blob = new Blob([JSON.stringify(res.data.items, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `inventory_export_${Date.now()}.json`;
      a.click();
      showToast(`✅ Đã export ${res.data.count} kiện`, true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Lỗi export', false);
    }
  };

  const agingCount = summary?.by_aging || { NORMAL: 0, WARNING: 0, CRITICAL: 0 };

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl text-violet-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Dashboard Tồn Kho (UC-19)</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              SLA: ⚠ {slaThresholds.warning_hours}h · 🔴 {slaThresholds.critical_hours}h ·{' '}
              {socketConnected ? <span className="text-emerald-400">● Realtime ON</span> : <span className="text-rose-400">● Offline</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => loadData(1)} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold rounded-xl transition cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
            <Package className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Tổng tồn kho</p>
            <p className="text-3xl font-black text-slate-100">{summary.total}</p>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-800/40 p-4 rounded-2xl text-center cursor-pointer hover:border-emerald-600 transition" onClick={() => setAgingFilter('NORMAL')}>
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Bình thường</p>
            <p className="text-3xl font-black text-emerald-300">{agingCount.NORMAL}</p>
          </div>
          <div className="bg-amber-950/30 border border-amber-800/40 p-4 rounded-2xl text-center cursor-pointer hover:border-amber-600 transition" onClick={() => setAgingFilter('WARNING')}>
            <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
            <p className="text-[10px] text-amber-400 uppercase font-bold mb-1">Cảnh báo ≥{slaThresholds.warning_hours}h</p>
            <p className="text-3xl font-black text-amber-300">{agingCount.WARNING}</p>
          </div>
          <div className="bg-rose-950/30 border border-rose-800/40 p-4 rounded-2xl text-center cursor-pointer hover:border-rose-600 transition" onClick={() => setAgingFilter('CRITICAL')}>
            <XCircle className="w-6 h-6 text-rose-400 mx-auto mb-1.5" />
            <p className="text-[10px] text-rose-400 uppercase font-bold mb-1">Nguy hiểm ≥{slaThresholds.critical_hours}h</p>
            <p className="text-3xl font-black text-rose-300">{agingCount.CRITICAL}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL','NORMAL','WARNING','CRITICAL'] as AgingStatus[]).map(s => (
          <button key={s} onClick={() => { setAgingFilter(s); loadData(1); }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              agingFilter === s
                ? 'bg-violet-600 border-violet-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}>
            {s}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 flex items-center">{pagination.total} kiện</span>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Mã vận đơn</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Nhập kho</th>
                <th className="py-3 px-4">Dwell Time</th>
                <th className="py-3 px-4">Aging</th>
                <th className="py-3 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 text-sm">Đang tải...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 text-sm">Không có dữ liệu tồn kho.</td></tr>
              )}
              {items.map(item => (
                <tr key={item.tracking_code}
                  className={`transition hover:bg-slate-800/30 ${item.aging_status === 'CRITICAL' ? 'bg-rose-950/10' : item.aging_status === 'WARNING' ? 'bg-amber-950/10' : ''}`}>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-violet-400 text-xs">{item.tracking_code}</span>
                    {item.is_flagged && <span className="ml-1 text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 rounded">FLAG</span>}
                  </td>
                  <td className="py-3 px-4"><StatusChip status={item.status} /></td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    {item.current_zone ? (
                      <span className="flex items-center gap-1">
                        <Map className="w-3 h-3 text-violet-400" />
                        {item.current_zone.code}
                      </span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    {item.hub_inbound_at ? new Date(item.hub_inbound_at).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-bold ${item.aging_status === 'CRITICAL' ? 'text-rose-400' : item.aging_status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {item.dwell_human}
                    </span>
                  </td>
                  <td className="py-3 px-4"><AgingBadge status={item.aging_status} /></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => setHistoryTarget(item.tracking_code)}
                        title="Lịch sử di chuyển"
                        className="p-1.5 bg-slate-800 hover:bg-violet-900 text-slate-400 hover:text-violet-300 rounded-lg transition cursor-pointer border border-slate-700 hover:border-violet-600">
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setActionTarget(item)}
                        title="Hành động"
                        className="p-1.5 bg-slate-800 hover:bg-violet-900 text-slate-400 hover:text-violet-300 rounded-lg transition cursor-pointer border border-slate-700 hover:border-violet-600">
                        <Cpu className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
            <p className="text-xs text-slate-400">
              Trang {pagination.page}/{pagination.total_pages} · {pagination.total} kiện
            </p>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => loadData(pagination.page - 1)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition disabled:opacity-30 cursor-pointer border border-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={pagination.page >= pagination.total_pages} onClick={() => loadData(pagination.page + 1)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition disabled:opacity-30 cursor-pointer border border-slate-700">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zone breakdown */}
      {summary && summary.by_zone.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Map className="w-4 h-4 text-violet-400" /> Phân bố theo Zone
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {summary.by_zone.map((z, i) => (
              <div key={i} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 hover:border-violet-700/50 transition">
                <p className="text-xs font-mono font-bold text-violet-400">{z.zone_code || '—'}</p>
                <p className="text-[10px] text-slate-500">{z.zone_type}</p>
                <p className="text-xl font-black text-slate-100 mt-1">{z.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl border transition-all ${
          toast.ok ? 'bg-emerald-950/95 text-emerald-200 border-emerald-700' : 'bg-rose-950/95 text-rose-200 border-rose-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {historyTarget && <MovementHistoryPanel trackingCode={historyTarget} onClose={() => setHistoryTarget(null)} />}
      {actionTarget && (
        <ActionMenu
          item={actionTarget}
          onClose={() => setActionTarget(null)}
          onDone={(msg, ok) => { showToast(msg, ok); loadData(1); }}
        />
      )}
    </div>
  );
};

export default WarehouseInventoryDashboardPage;
