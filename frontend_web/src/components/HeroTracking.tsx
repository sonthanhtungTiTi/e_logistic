import React, { useState } from 'react';
import { Search, ShieldCheck, Zap, Thermometer, ArrowRight, CheckCircle2, Sparkles, Navigation, MapPin, Loader2, Package, LayoutList, AlignJustify } from 'lucide-react';
import type { Order } from '../types/order.types';
import heroBg from '../assets/hero_bg.png';
import { orderApi } from '../api/order.api';

interface HeroTrackingProps {
  orders: Order[];
  onOpenOrderDetails: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  onCancelOrder?: (order: Order) => void;
}

export const HeroTracking: React.FC<HeroTrackingProps> = ({
  orders,
  onOpenOrderDetails,
  onEditOrder,
  onCancelOrder,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'bar'>('table');

  const performSearch = async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setSearchError('Vui lòng nhập mã vận đơn (VD: ELG559535153VN hoặc kèm 4 số SĐT: ELG559535153VN 153)');
      return;
    }

    // Parse trackingCode and optional 4-digit phone if user typed e.g. "ELG559535153VN 0153" or "ELG559535153VN, 153"
    const parts = trimmed.split(/[\s,]+/);
    const cleanCode = parts[0];
    const phoneLast4 = parts.length > 1 && /^\d{3,4}$/.test(parts[1]) ? parts[1] : undefined;

    // First, check loaded orders list
    const foundLocal = orders.find((o) => {
      const c = o.trackingCode || o.trackingNumber || '';
      return c.toLowerCase() === cleanCode.toLowerCase() || (o._id && o._id === cleanCode);
    });

    if (foundLocal) {
      setSearchError('');
      onOpenOrderDetails(foundLocal);
      return;
    }

    // Otherwise fetch directly from backend API with Rate Limiting & PII Masking
    setIsSearching(true);
    setSearchError('');
    try {
      const response = await orderApi.trackOrderPublic(cleanCode, phoneLast4);
      if (response.data?.success && response.data.data) {
        onOpenOrderDetails(response.data.data);
      } else {
        setSearchError(`Không tìm thấy vận đơn nào khớp với thông tin tra cứu.`);
      }
    } catch (err: any) {
      console.error('Lỗi tra cứu vận đơn:', err);
      const msg = err.response?.data?.message || `Không tìm thấy thông tin vận đơn "${cleanCode}". Vui lòng kiểm tra lại.`;
      setSearchError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchInput);
  };

  return (
    <div className="space-y-8">
      {/* Hero Search Section */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 p-6 sm:p-12">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img src={heroBg} alt="Background" className="w-full h-full object-cover" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Hệ Thống Logistics Dược Phẩm Sinh Học Thông Minh
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
            Tra Cứu & Quản Lý <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
              Vận Đơn Theo Thời Gian Thực
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl leading-relaxed">
            Giám sát lộ trình giao hàng cold-chain, kiểm soát nhiệt độ từ 2°C - 8°C và quản lý trạng thái đơn hàng tức thì từ cơ sở dữ liệu MongoDB.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="space-y-2">
            <div className="relative flex flex-col sm:flex-row items-center gap-2 p-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 px-3 py-2 w-full">
                <Search className="w-5 h-5 text-blue-400 shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (searchError) setSearchError('');
                  }}
                  placeholder="Nhập mã vận đơn (VD: ELG559535153VN, ELG747262514VN...)"
                  className="w-full bg-transparent text-white placeholder-slate-400 text-sm outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang Tra Cứu...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Tra Cứu Đơn
                  </>
                )}
              </button>
            </div>

            {searchError && (
              <p className="text-xs font-semibold text-rose-400 px-2 animate-in fade-in duration-200">
                ⚠️ {searchError}
              </p>
            )}
          </form>

          {/* Quick Tracking Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <span className="text-slate-400 font-medium">Mẫu tra cứu nhanh:</span>
            {orders.slice(0, 3).map((ord) => {
              const code = ord.trackingCode || ord.trackingNumber;
              if (!code) return null;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setSearchInput(code);
                    performSearch(code);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-blue-600/30 border border-slate-700 text-blue-300 font-mono font-bold transition cursor-pointer"
                >
                  {code}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 mt-8 border-t border-slate-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">&lt; 3 Sec</div>
              <div className="text-xs text-slate-400">Thời Gian Lập Route AI</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">2 - 8°C</div>
              <div className="text-xs text-slate-400">Kiểm Soát Chuẩn Cold Chain</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">100% Audit</div>
              <div className="text-xs text-slate-400">Nhật Ký & Khóa Bảo Mật</div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Live Trackings Horizontal List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
            <h2 className="text-xl font-extrabold text-white">Vận Đơn Đang Chuyển Động Hàng Ngày</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden md:inline">
              Nhấn Chi Tiết / Sửa / Hủy để quản lý vận đơn
            </span>
            <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Bảng Ngang Đầy Đủ"
              >
                <LayoutList className="w-4 h-4" />
                <span className="text-xs">Bảng Ngang</span>
              </button>
              <button
                onClick={() => setViewMode('bar')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'bar' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Thẻ Ngang Rộng"
              >
                <AlignJustify className="w-4 h-4" />
                <span className="text-xs">Thẻ Ngang</span>
              </button>
            </div>
          </div>
        </div>

        {orders.length > 0 ? (
          viewMode === 'table' ? (
            /* FULL HORIZONTAL TABLE (DẠNG BẢNG NGANG ĐẦY ĐỦ NHƯ ẢNH THIẾT KẾ) */
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">MÃ VẬN ĐƠN</th>
                      <th className="py-3.5 px-4">NGƯỜI NHẬN & NƠI GIAO</th>
                      <th className="py-3.5 px-4">TRỌNG LƯỢNG (THỰC / DIM)</th>
                      <th className="py-3.5 px-4">CƯỚC PHÍ</th>
                      <th className="py-3.5 px-4">TRẠNG THÁI</th>
                      <th className="py-3.5 px-4 text-right">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {orders.map((ord) => {
                      const code = ord.trackingCode || ord.trackingNumber || '';
                      const recipientName = ord.deliveryAddress?.fullName || ord.recipientName || 'Người nhận';
                      const recipientAddress = [
                        ord.deliveryAddress?.address,
                        ord.deliveryAddress?.district,
                        ord.deliveryAddress?.province
                      ].filter(Boolean).join(', ') || ord.recipientAddress || 'Địa chỉ N/A';

                      const actualWeight = ord.actualWeight || ord.weightKg || 0;
                      const chargeableWeightVal = ord.chargeableWeight || ord.chargeableWeightKg || actualWeight;
                      const fee = ord.shippingFee || ord.cost || 0;
                      const isEditable = ['CREATED', 'PENDING_VERIFICATION', 'READY_TO_PICK', 'PENDING'].includes(ord.status);

                      return (
                        <tr key={ord._id || ord.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-4 px-4 font-mono font-bold text-blue-400">
                            <button
                              onClick={() => onOpenOrderDetails(ord)}
                              className="hover:underline cursor-pointer text-left"
                            >
                              {code}
                            </button>
                            <span className="block text-[10px] font-normal text-slate-500">{ord.serviceType || 'EXPRESS'}</span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="font-bold text-white">{recipientName}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">{recipientAddress}</div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="text-slate-200 font-mono">{actualWeight} kg (Thực)</div>
                            <div className="text-cyan-400 text-[11px] font-mono">➡ {chargeableWeightVal} kg (Tính cước)</div>
                          </td>

                          <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                            {fee.toLocaleString('vi-VN')} đ
                          </td>

                          <td className="py-4 px-4">
                            <span
                              className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                                ord.status === 'CANCELLED'
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : ord.status === 'DELIVERED'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : ord.status === 'IN_TRANSIT' || ord.status === 'OUT_FOR_DELIVERY'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onOpenOrderDetails(ord)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition cursor-pointer"
                                title="Xem chi tiết vận đơn"
                              >
                                Chi Tiết
                              </button>

                              {isEditable && onEditOrder && (
                                <button
                                  onClick={() => onEditOrder(ord)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
                                  title="Chỉnh sửa đơn hàng"
                                >
                                  Sửa
                                </button>
                              )}

                              {isEditable && onCancelOrder && (
                                <button
                                  onClick={() => onCancelOrder(ord)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                                  title="Hủy đơn hàng"
                                >
                                  Hủy
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* HORIZONTAL BAR CARDS (DẠNG THẺ THUÔN NGANG RỘNG) */
            <div className="space-y-3">
              {orders.map((ord) => {
                const code = ord.trackingCode || ord.trackingNumber || '';
                const origin = ord.pickupAddress?.province || ord.originCity || 'TP.HCM';
                const dest = ord.deliveryAddress?.province || ord.destinationCity || 'Hà Nội';
                const recipientName = ord.deliveryAddress?.fullName || ord.recipientName || 'Người nhận';
                const weight = ord.chargeableWeight || ord.chargeableWeightKg || ord.actualWeight || 0;
                const fee = ord.shippingFee || ord.cost || 0;
                const isEditable = ['CREATED', 'PENDING_VERIFICATION', 'READY_TO_PICK', 'PENDING'].includes(ord.status);

                return (
                  <div
                    key={ord._id || ord.id}
                    className="glass-card rounded-2xl p-4 border border-slate-800 hover:border-blue-500/40 transition group flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                  >
                    {/* Left: Code & Service */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                        {code}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                          ord.status === 'DELIVERED'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : ord.status === 'IN_TRANSIT' || ord.status === 'OUT_FOR_DELIVERY'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {ord.status === 'IN_TRANSIT'
                          ? 'Đang vận chuyển'
                          : ord.status === 'OUT_FOR_DELIVERY'
                            ? 'Đang phát hàng'
                            : ord.status === 'DELIVERED'
                              ? 'Đã giao'
                              : 'Chờ xử lý'}
                      </span>
                    </div>

                    {/* Middle: Route & Recipient */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-200 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        {origin} ➔ {dest}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        Người nhận: <span className="text-slate-200 font-semibold">{recipientName}</span>
                      </p>
                    </div>

                    {/* Right: Weight, Fee & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                      <div className="text-left md:text-right text-xs">
                        <div className="text-slate-400">TL: <strong className="text-white">{weight} kg</strong></div>
                        {fee > 0 && <div className="text-emerald-400 font-mono font-bold">{fee.toLocaleString('vi-VN')} đ</div>}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenOrderDetails(ord)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          Chi Tiết <ArrowRight className="w-3 h-3" />
                        </button>
                        {isEditable && onEditOrder && (
                          <button
                            onClick={() => onEditOrder(ord)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                          >
                            Sửa
                          </button>
                        )}
                        {isEditable && onCancelOrder && (
                          <button
                            onClick={() => onCancelOrder(ord)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">Chưa có vận đơn nào trong CSDL MongoDB</p>
            <p className="text-xs text-slate-500">Các vận đơn vừa khởi tạo sẽ xuất hiện tại đây theo thời gian thực.</p>
          </div>
        )}
      </div>
    </div>
  );
};
