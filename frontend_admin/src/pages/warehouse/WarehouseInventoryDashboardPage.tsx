import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io as socketIO, Socket } from 'socket.io-client';
import { inventoryApi } from '@/api/inventory.api';
import type {
  AgingItem,
  SummaryData,
  MovementHistoryData,
  AgingStatus,
  InventoryActionType,
  TripSuggestion,
} from '@/api/inventory.api';
import {
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  RefreshCcw,
  Download,
  History,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Truck,
  TrendingUp,
  Search,
  CheckSquare,
  Square,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

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
  const warnStatuses = ['SEARCH_ZONE', 'SUSPECTED_LOST', 'LOST', 'OVERDUE', 'SURPLUS'];
  const cls = warnStatuses.includes(status)
    ? 'bg-rose-950/60 text-rose-300 border-rose-700/50'
    : 'bg-slate-800 text-slate-300 border-slate-700';
  return <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold ${cls}`}>{status}</span>;
}

// ── Movement history modal ────────────────────────────────────────────────────
function MovementHistoryPanel({ trackingCode, onClose }: { trackingCode: string; onClose: () => void }) {
  const [history, setHistory] = useState<MovementHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi
      .getMovementHistory(trackingCode)
      .then((r) => {
        setHistory(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [trackingCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-orange-400" />
              Lịch sử: <span className="text-orange-300 font-mono">{trackingCode}</span>
            </h3>
            {history && (
              <p className="text-xs text-slate-400 mt-0.5">
                Hiện tại: <StatusChip status={history.current_status} /> · Dwell: {history.dwell_human} ·{' '}
                <AgingBadge status={history.aging_status} />
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading && <p className="text-slate-400 text-sm text-center py-6">Đang tải...</p>}
          {!loading && history?.logs.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-6">Không có log nào.</p>
          )}
          {history?.logs.map((log) => (
            <div
              key={log._id}
              className="flex gap-3 items-start p-3 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition"
            >
              <div className="w-1.5 h-1.5 mt-2 rounded-full bg-orange-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300">
                  <span className="font-mono text-slate-500">{log.preStatus}</span>
                  {' → '}
                  <span className="font-mono text-orange-300 font-bold">{log.postStatus}</span>
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

// ── Action modal ──────────────────────────────────────────────────────────────
function ActionMenu({
  item,
  onClose,
  onDone,
}: {
  item: AgingItem;
  onClose: () => void;
  onDone: (msg: string, ok: boolean) => void;
}) {
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
      onDone(err.response?.data?.message || 'Lỗi thực hiện thao tác', false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-sm">
            Thao tác OCC Tồn kho: <span className="text-orange-400 font-mono">{item.tracking_code}</span>
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Trạng thái: <StatusChip status={item.status} /> · Dwell: <span className="font-bold text-white">{item.dwell_human}</span> ·{' '}
          <AgingBadge status={item.aging_status} />
        </p>
        <textarea
          placeholder="Lý do thao tác (không bắt buộc)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 resize-none"
        />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => doAction('RETURN')}
            disabled={loading}
            className="py-2.5 px-3 bg-amber-600/80 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Chuyển hoàn
          </button>
          <button
            onClick={() => doAction('LIQUIDATE')}
            disabled={loading}
            className="py-2.5 px-3 bg-rose-600/80 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Thanh lý
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export const WarehouseInventoryDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [tripSuggestions, setTripSuggestions] = useState<TripSuggestion[]>([]);
  const [agingData, setAgingData] = useState<AgingItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [agingFilter, setAgingFilter] = useState<AgingStatus>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dwellRangeFilter, setDwellRangeFilter] = useState<string>('ALL');

  // Selected for batch operations
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);

  // Modals
  const [historyCode, setHistoryCode] = useState<string | null>(null);
  const [actionItem, setActionItem] = useState<AgingItem | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sumRes, agingRes, tripRes] = await Promise.all([
        inventoryApi.getSummary(),
        inventoryApi.getAging({
          page: pagination.page,
          limit: pagination.limit,
          aging_status: agingFilter,
          zone_id: selectedZone || undefined,
          search: searchTerm || undefined,
          dwell_range: dwellRangeFilter !== 'ALL' ? dwellRangeFilter : undefined,
        }),
        inventoryApi.getTripSuggestions().catch(() => ({ data: [] })),
      ]);
      setSummary(sumRes.data);
      setAgingData(agingRes.data.items);
      setPagination(agingRes.data.pagination);
      setTripSuggestions(tripRes.data || []);
    } catch (err: any) {
      console.error('Error loading inventory data:', err);
    }
  }, [pagination.page, pagination.limit, agingFilter, selectedZone, searchTerm, dwellRangeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Socket.IO Real-time setup
  useEffect(() => {
    const socket = socketIO('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('INVENTORY_UPDATE', () => {
      loadData();
    });

    return () => {
      socket.disconnect();
    };
  }, [loadData]);

  // Handle Export
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await inventoryApi.exportInventory({ aging_status: agingFilter, format });
      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([res]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_export_${Date.now()}.csv`;
        a.click();
        toast.success('Đã tải xuống file CSV thành công!');
      } else {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_export_${Date.now()}.json`;
        a.click();
        toast.success('Đã tải xuống file JSON thành công!');
      }
    } catch (err: any) {
      toast.error('Lỗi khi xuất dữ liệu tồn kho');
    }
  };

  // Handle Batch Action
  const handleBatchAction = async (actionType: InventoryActionType) => {
    if (selectedCodes.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 kiện hàng để thực hiện!');
      return;
    }
    setBatchLoading(true);
    try {
      const res = await inventoryApi.performBatchAction({
        tracking_codes: selectedCodes,
        action_type: actionType,
        reason: `Xử lý hàng loạt ${actionType} từ Dashboard`,
      });
      toast.success(`Đã xử lý xong: ${res.data.success_count}/${res.data.total} kiện thành công!`);
      setSelectedCodes([]);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi xử lý hàng loạt');
    } finally {
      setBatchLoading(false);
    }
  };

  // Handle 1-Click Create Trip from Stock
  const handleCreateTripFromSuggestion = async (sug: TripSuggestion) => {
    try {
      const res = await inventoryApi.createTripFromStock({
        destination_hub_id: sug.destination_hub_id,
        tracking_codes: sug.tracking_codes,
      });
      toast.success(`⚡ Đã tạo Chuyến xe [${res.data.trip_code}] gồm ${sug.total_items} kiện đi ${sug.destination_hub_name}!`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo chuyến xe');
    }
  };

  const toggleSelectAll = () => {
    if (selectedCodes.length === agingData.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(agingData.map((i) => i.tracking_code));
    }
  };

  const toggleSelectOne = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-orange-500" />
            Dashboard Quản Lý Tồn Kho & Aging SLA (UC-19)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Giám sát Sức chứa Zone · Cảnh báo Nghẽn Kho · Vận tốc Nhập/Xuất 24h & Gợi ý Gom xe
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            CSV
          </button>
          <button
            onClick={loadData}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>
      </div>

      {/* TOP METRICS: AGING & 24H VELOCITY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Stock */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">TỔNG TỒN KHO</span>
            <Package className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono mt-1">{summary?.total || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Giá trị: <span className="text-orange-300 font-semibold">{((summary?.total_stock_value_vnd || 0) / 1e6).toFixed(1)} tr đ</span>
          </p>
        </div>

        {/* Normal SLA */}
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">NORMAL (&lt;24H)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300 font-mono mt-1">{summary?.by_aging?.NORMAL || 0}</p>
          <p className="text-[11px] text-emerald-400/80 mt-0.5">Lưu kho an toàn</p>
        </div>

        {/* Warning SLA */}
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase">WARNING (24-48H)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 font-mono mt-1">{summary?.by_aging?.WARNING || 0}</p>
          <p className="text-[11px] text-amber-400/80 mt-0.5">Cần ưu tiên xuất</p>
        </div>

        {/* Critical SLA */}
        <div className="bg-rose-950/30 border border-rose-800/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-400 uppercase">CRITICAL (&gt;48H)</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-300 font-mono mt-1">{summary?.by_aging?.CRITICAL || 0}</p>
          <p className="text-[11px] text-rose-400/80 mt-0.5">Quá hạn SLA nghiêm trọng</p>
        </div>
      </div>

      {/* 2 CỘT: SỨC CHỨA ZONE & GỢI Ý GOM CHUYẾN XE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1: Sức chứa Zone & Cảnh báo Nghẽn */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-400" />
              Sức Chứa Khu Vực (Zone Utilization & Bottleneck Warning)
            </h2>
            {summary?.throughput_24h && (
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Vận tốc 24h: <b className="text-white">{summary.throughput_24h.inbound_count} Nhập</b> /{' '}
                <b className="text-orange-400">{summary.throughput_24h.outbound_count} Xuất</b> ({summary.throughput_24h.turnover_ratio}%)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {summary?.by_zone?.map((z) => {
              const isOver = z.capacity_status === 'CRITICAL_OVERCAPACITY';
              const isWarn = z.capacity_status === 'WARNING';
              return (
                <div
                  key={z.zone_id}
                  className={`p-3.5 rounded-xl border transition ${
                    isOver
                      ? 'bg-rose-950/30 border-rose-600/50'
                      : isWarn
                      ? 'bg-amber-950/20 border-amber-600/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-200 truncate">{z.zone_name || z.zone_code}</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        isOver ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {z.current_count} / {z.capacity} ({z.utilization_percent}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOver ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${z.utilization_percent}%` }}
                    />
                  </div>

                  {isOver && (
                    <p className="text-[10px] text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> 🚨 CẢNH BÁO NGHẼN KHAY / QUÁ TẢI (&gt;90%)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cột 2: Gợi ý tạo chuyến xe thông minh */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Zap className="w-4 h-4 text-orange-400" />
              Gợi Ý Gom Chuyến Xe (Smart Auto-Trip)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Phát hiện các kiện đang chờ trung chuyển theo tuyến:
            </p>

            {tripSuggestions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                Không có kiện hàng chờ gom chuyến xe tại kho lúc này.
              </p>
            ) : (
              <div className="space-y-2.5 mt-3 max-h-56 overflow-y-auto pr-1">
                {tripSuggestions.map((sug) => (
                  <div
                    key={sug.destination_hub_id}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-orange-400 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" />
                        {sug.destination_hub_name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {sug.total_items} kiện · {sug.total_weight_kg} kg
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateTripFromSuggestion(sug)}
                      className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] rounded-lg shadow transition flex items-center gap-1"
                    >
                      ⚡ Tạo xe
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILTER & BATCH ACTION BAR */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã vận đơn (ELG-VN-...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Aging Status Filter Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['ALL', 'NORMAL', 'WARNING', 'CRITICAL'] as AgingStatus[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setAgingFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  agingFilter === tab ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Dwell Range Filter */}
          <select
            value={dwellRangeFilter}
            onChange={(e) => setDwellRangeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">Mọi thời gian lưu kho</option>
            <option value="<12h">&lt; 12 giờ</option>
            <option value="12-24h">12 - 24 giờ</option>
            <option value="24-48h">24 - 48 giờ</option>
            <option value=">48h">&gt; 48 giờ (Quá hạn)</option>
          </select>

          {/* Zone Filter */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
          >
            <option value="">Tất cả khu vực (Zones)</option>
            {summary?.by_zone?.map((z) => (
              <option key={z.zone_id} value={z.zone_id}>
                {z.zone_name || z.zone_code} ({z.current_count})
              </option>
            ))}
          </select>
        </div>

        {/* Batch Operations Bar (Khi có chọn checkbox) */}
        {selectedCodes.length > 0 && (
          <div className="flex items-center justify-between bg-orange-950/40 border border-orange-600/50 p-3 rounded-xl text-xs">
            <span className="font-bold text-orange-300">
              Đã chọn: {selectedCodes.length} kiện hàng
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBatchAction('RETURN')}
                disabled={batchLoading}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Chuyển hoàn hàng loạt
              </button>
              <button
                onClick={() => handleBatchAction('LIQUIDATE')}
                disabled={batchLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Thanh lý hàng loạt
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AGING INVENTORY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                    {selectedCodes.length > 0 && selectedCodes.length === agingData.length ? (
                      <CheckSquare className="w-4 h-4 text-orange-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Mã Vận Đơn</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Khu Vực (Zone)</th>
                <th className="py-3 px-4">Đích Đến</th>
                <th className="py-3 px-4">Thời Gian Lưu (Dwell)</th>
                <th className="py-3 px-4">Mức SLA</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {agingData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                    Không tìm thấy kiện hàng nào theo bộ lọc.
                  </td>
                </tr>
              ) : (
                agingData.map((item) => {
                  const isSelected = selectedCodes.includes(item.tracking_code);
                  return (
                    <tr
                      key={item.tracking_code}
                      className={`transition ${isSelected ? 'bg-orange-950/20' : 'hover:bg-slate-800/40'}`}
                    >
                      <td className="py-3 px-4">
                        <button onClick={() => toggleSelectOne(item.tracking_code)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-orange-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-orange-400">
                        {item.tracking_code}
                      </td>
                      <td className="py-3 px-4">
                        <StatusChip status={item.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {item.current_zone?.name || item.current_zone?.code || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {item.destination_hub?.province || item.destination_hub?.name || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {item.dwell_human}
                      </td>
                      <td className="py-3 px-4">
                        <AgingBadge status={item.aging_status} />
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setHistoryCode(item.tracking_code)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg border border-slate-700 transition"
                        >
                          Lịch sử
                        </button>
                        <button
                          onClick={() => setActionItem(item)}
                          className="px-2.5 py-1 bg-orange-600/90 hover:bg-orange-500 text-white font-semibold rounded-lg shadow transition"
                        >
                          Xử lý
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Tổng số: <b>{pagination.total}</b> kiện hàng</span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-white">
              {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {historyCode && (
        <MovementHistoryPanel trackingCode={historyCode} onClose={() => setHistoryCode(null)} />
      )}
      {actionItem && (
        <ActionMenu
          item={actionItem}
          onClose={() => setActionItem(null)}
          onDone={(msg) => toast.info(msg)}
        />
      )}
    </div>
  );
};

export default WarehouseInventoryDashboardPage;
