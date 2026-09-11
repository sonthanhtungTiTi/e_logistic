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
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              Cảnh Báo Nghẽn & Đề Xuất Gom Chuyến Xe Tồn Kho
              {congestedZones.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                  {congestedZones.length} Khu Vực Quá Tải
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Phân tích AI tự động phát hiện hàng tồn theo tuyến cần xuất xe tải ngay để giải phóng kho
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
            msg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-600/50 text-emerald-300'
              : 'bg-rose-950/70 border-rose-600/50 text-rose-300'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{msg.text}</span>
        </div>
      )}

      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1 text-xs">
          {/* Cột 1: Cảnh báo SLA & Sức chứa */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng Tồn Kho</span>
                <span className="text-xl font-black text-white font-mono mt-0.5 block">
                  {summary?.total || 0}
                </span>
                <span className="text-[10px] text-slate-500">kiện hàng đang lưu bãi</span>
              </div>

              <div className="p-3 bg-rose-950/25 rounded-2xl border border-rose-800/40">
                <span className="text-[10px] text-rose-400 font-bold uppercase block">Quá SLA (&gt;48H)</span>
                <span className="text-xl font-black text-rose-300 font-mono mt-0.5 block">
                  {criticalAgingCount}
                </span>
                <span className="text-[10px] text-rose-400/80">cần ưu tiên giải tỏa</span>
              </div>
            </div>

            {/* Cảnh báo Nghẽn Khu Vực (Zone Congestion) */}
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-orange-400" /> Trạng Thái Các Zone
              </span>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {(summary?.by_zone || []).slice(0, 4).map((z) => (
                  <div key={z.zone_id} className="text-[11px]">
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span className="truncate">{z.zone_name || z.zone_code}</span>
                      <span className="font-mono font-bold text-slate-400">{z.utilization_percent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${
                          z.utilization_percent >= 90
                            ? 'bg-rose-500'
                            : z.utilization_percent >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, z.utilization_percent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cột 2 & 3: Đề Xuất Gom Chuyến Xe (Smart Auto-Trip Suggestions) */}
          <div className="lg:col-span-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> Đề Xuất Tạo Chuyến Xe Theo Tuyến
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {suggestions.length} tuyến có đủ hàng gom xe
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-orange-400" />
                Đang quét phân tích kiện hàng tồn...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-8 bg-slate-950/60 rounded-2xl border border-slate-800 text-center text-slate-500">
                Chưa có đủ kiện gom chuyến xe tự động tại hub lúc này.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {suggestions.map((sug) => (
                  <div
                    key={sug.destination_hub_id}
                    className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 hover:border-orange-500/40 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-orange-400" />
                          {sug.destination_hub_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-mono font-bold text-[10px]">
                          {sug.total_items} kiện
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Tổng khối lượng: <b className="text-white font-mono">{sug.total_weight_kg} kg</b>
                      </p>
                    </div>

                    <button
                      onClick={() => handleCreateTrip(sug)}
                      disabled={creatingTrip === sug.destination_hub_id}
                      className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
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
