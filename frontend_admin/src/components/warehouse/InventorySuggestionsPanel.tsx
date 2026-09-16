import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Zap,
  Truck,
  Package,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { inventoryApi, type SummaryData, type TripSuggestion } from '../../api/inventory.api';

interface InventorySuggestionsPanelProps {
  onTripCreated?: () => void;
}

export const InventorySuggestionsPanel: React.FC<InventorySuggestionsPanelProps> = ({ onTripCreated }) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creatingTrip, setCreatingTrip] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, sugRes] = await Promise.all([
        inventoryApi.getSummary(),
        inventoryApi.getTripSuggestions(),
      ]);
      setSummary(sumRes.data);
      setSuggestions(sugRes.data || []);
    } catch (err: any) {
      console.warn('Lỗi tải cảnh báo & đề xuất tồn kho:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTrip = async (sug: TripSuggestion) => {
    setCreatingTrip(sug.destination_hub_id);
    setMsg(null);
    try {
      await inventoryApi.createTripFromStock({
        destination_hub_id: sug.destination_hub_id,
        tracking_codes: sug.tracking_codes || [],
      });
      setMsg({
        type: 'success',
        text: `Đã tự động khởi tạo chuyến xe trung chuyển thành công!`,
      });
      loadData();
      if (onTripCreated) onTripCreated();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || 'Không thể tạo chuyến xe từ đề xuất',
      });
    } finally {
      setCreatingTrip(null);
    }
  };

  const criticalAgingCount = summary?.by_aging?.CRITICAL || 0;
  const congestedZones = (summary?.by_zone || []).filter(
    (z) => z.capacity_status === 'CRITICAL_OVERCAPACITY' || z.utilization_percent >= 90
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              Cảnh Báo Nghẽn &amp; Đề Xuất Gom Chuyến Xe Tồn Kho
              {congestedZones.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-300 text-[10px] font-bold">
                  {congestedZones.length} Khu Vực Quá Tải
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Phân tích AI tự động phát hiện hàng tồn theo tuyến cần xuất xe tải ngay để giải phóng kho
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
            msg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-600/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-600/50 text-rose-800 dark:text-rose-300'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
          <span>{msg.text}</span>
        </div>
      )}

      {!isCollapsed && (
        <div className="space-y-4 pt-1 text-xs">
          {/* HÀNG 1: Cảnh báo SLA, Sức chứa & Trạng thái Zone xếp ngang */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">Tổng Tồn Kho</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {summary?.total || 0}
                </span>
                <span className="text-[10px] text-slate-500">kiện hàng đang lưu bãi</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
                <Package className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">Quá SLA (&gt;48H)</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {criticalAgingCount}
                </span>
                <span className="text-[10px] text-slate-500">cần ưu tiên giải tỏa</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* Cảnh báo Nghẽn Khu Vực (Zone Congestion) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Trạng Thái Các Zone
              </span>
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {(summary?.by_zone || []).slice(0, 3).map((z) => (
                  <div key={z.zone_id} className="text-[10px]">
                    <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-0.5">
                      <span className="truncate max-w-[140px]">{z.zone_name || z.zone_code}</span>
                      <span className="font-mono font-bold text-slate-500 dark:text-slate-400">{z.utilization_percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${Math.min(100, z.utilization_percent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HÀNG 2: Đề Xuất Gom Chuyến Xe (Cấu Trúc Khối Xổ Ngang) */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> Đề Xuất Tạo Chuyến Xe Theo Tuyến
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {suggestions.length} tuyến có đủ hàng gom xe
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                Đang quét phân tích kiện hàng tồn...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-6 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-500">
                Chưa có đủ kiện gom chuyến xe tự động tại hub lúc này.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestions.map((sug) => (
                  <div
                    key={sug.destination_hub_id}
                    className="p-4 bg-slate-50 dark:bg-slate-950/90 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition flex flex-col justify-between space-y-3 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          {sug.destination_hub_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-mono font-bold text-[10px]">
                          {sug.total_items} kiện
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Tổng khối lượng: <b className="text-slate-900 dark:text-white font-mono">{sug.total_weight_kg} kg</b>
                      </p>
                    </div>

                    <button
                      onClick={() => handleCreateTrip(sug)}
                      disabled={creatingTrip === sug.destination_hub_id}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition cursor-pointer"
                    >
                      {creatingTrip === sug.destination_hub_id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      1-Chạm Tạo Chuyến Xe Ngay
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
