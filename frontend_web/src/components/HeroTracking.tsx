import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router';
import { Search, ShieldCheck, Zap, Thermometer, ArrowRight, Sparkles, Navigation, MapPin, Loader2, Package, LayoutList, AlignJustify, Phone, Lock, Rocket, LogIn, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import type { Order } from '../types/order.types';
import heroBg from '../assets/hero_bg.png';
import { orderApi } from '../api/order.api';
import { AuthContext } from '../context/AuthContext';

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
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [searchInput, setSearchInput] = useState('');
  const [phoneLast4Input, setPhoneLast4Input] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'bar'>('table');

  const performSearch = async (rawCode: string, rawPhone4: string) => {
    const cleanCode = rawCode.trim();
    const cleanPhone4 = rawPhone4.trim();

    if (!cleanCode) {
      setSearchError('Vui lòng nhập mã vận đơn (VD: ELG559535153VN).');
      return;
    }

    const isLoggedIn = Boolean(user);

    // Step 1: Search in local orders array owned by this Seller
    const localOrder = orders.find(
      (o) => o.trackingCode?.toLowerCase() === cleanCode.toLowerCase()
    );

    if (localOrder) {
      // Order belongs to this logged-in Seller! Open details directly without 4-digit phone.
      onOpenOrderDetails(localOrder);
      setSearchError('');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      // Step 2: If logged in, search authenticated server API for Seller's owned orders
      if (isLoggedIn) {
        const searchRes = await orderApi.searchOrders({ trackingCode: cleanCode });
        if (searchRes.data?.success && searchRes.data.data?.length > 0) {
          const found = searchRes.data.data.find(
            (o) => o.trackingCode?.toLowerCase() === cleanCode.toLowerCase()
          );
          if (found) {
            onOpenOrderDetails(found);
            return;
          }
        }
      }

      // Step 3: Order not owned by logged-in Seller (or Guest mode): Require 4-digit phone validation for security
      if (!cleanPhone4 || cleanPhone4.length !== 4 || !/^\d{4}$/.test(cleanPhone4)) {
        if (isLoggedIn) {
          setSearchError('Vận đơn này không nằm trong danh sách đơn hàng của bạn. Để tra cứu đơn hàng khác, vui lòng nhập 4 số cuối SĐT người nhận.');
        } else {
          setSearchError('Vui lòng nhập 4 số cuối số điện thoại người nhận (VD: 0153) để xác thực tra cứu bảo mật.');
        }
        return;
      }

      // Call public tracking API with 4-digit phone verification
      const response = await orderApi.trackOrderPublic(cleanCode, cleanPhone4);
      if (response.data?.success && response.data.data) {
        onOpenOrderDetails(response.data.data);
      } else {
        setSearchError(`Không tìm thấy vận đơn nào khớp với mã vận đơn và 4 số cuối SĐT đã nhập.`);
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
    performSearch(searchInput, phoneLast4Input);
  };

  return (
    <div className="space-y-8">
      {/* Hero Search Section */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-blue-200/90 dark:border-slate-800 shadow-2xl bg-gradient-to-br from-blue-100/90 via-slate-100/80 to-indigo-100/70 dark:from-slate-900/95 dark:via-slate-950 dark:to-[#0B1120] p-6 sm:p-12">
        {/* Subtle Map Overlay */}
        <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none mix-blend-multiply dark:mix-blend-screen">
          <img src={heroBg} alt="Background" className="w-full h-full object-cover" />
        </div>

        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/15 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/15 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 dark:bg-blue-500/15 border-2 border-blue-600/20 dark:border-blue-500/30 text-blue-700 dark:text-cyan-300 text-xs font-extrabold shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-blue-600 dark:text-cyan-400" />
            Hệ Thống Logistics Dược Phẩm Sinh Học Thông Minh
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight">
            Tra Cứu & Quản Lý <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 dark:from-blue-400 dark:via-cyan-300 dark:to-indigo-300">
              Vận Đơn Theo Thời Gian Thực
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-medium max-w-2xl leading-relaxed">
            Giám sát lộ trình giao hàng cold-chain, kiểm soát nhiệt độ từ 2°C - 8°C và quản lý trạng thái đơn hàng tức thì từ cơ sở dữ liệu MongoDB.
          </p>

          {/* Quick Create Order CTA Banner for Sellers */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                if (user) {
                  navigate('/seller/orders/create');
                } else {
                  navigate('/auth/login');
                }
              }}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {user ? (
                <>
                  <Rocket className="w-4 h-4 text-emerald-200" />
                  <span>Tạo Đơn Vận Chuyển Mới Ngay</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-emerald-200" />
                  <span>Đăng Nhập Để Tạo Đơn Hàng</span>
                </>
              )}
            </button>

            {user && (
              <button
                type="button"
                onClick={() => navigate('/seller/orders/batch')}
                className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-cyan-300 border border-slate-800 dark:border-cyan-500/40 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition shadow-lg shadow-slate-900/20 hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Tạo Đơn Theo Lô (Excel)</span>
              </button>
            )}
          </div>

          {/* Search Box with 2-Layer Security: Tracking Code + 4 Last Digits of Phone */}
          <form onSubmit={handleSearchSubmit} className="space-y-2">
            <div className="search-box-wrapper relative flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-900/95 border-2 border-blue-600/40 dark:border-slate-700/90 shadow-2xl shadow-blue-500/10 ring-4 ring-blue-500/10 dark:ring-0 backdrop-blur-xl">
              {/* Field 1: Tracking Code */}
              <div className="flex items-center gap-3 px-3.5 py-2 w-full sm:w-7/12 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800">
                <Search className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (searchError) setSearchError('');
                  }}
                  placeholder="Mã vận đơn (VD: ELG559535153VN)"
                  className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none font-mono font-bold"
                />
              </div>

              {/* Field 2: 4 Last Digits of Phone */}
              <div className="flex items-center gap-2 px-3.5 py-2 w-full sm:w-5/12">
                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <input
                  type="text"
                  maxLength={4}
                  value={phoneLast4Input}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPhoneLast4Input(val);
                    if (searchError) setSearchError('');
                  }}
                  placeholder={user ? '4 số cuối SĐT (Tùy chọn)' : '4 số cuối SĐT nhận *'}
                  className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm outline-none font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
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
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 px-2 animate-in fade-in duration-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{searchError}</span>
              </p>
            )}
          </form>

          {/* Quick Tracking Tag Examples */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-800 dark:text-slate-300 font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Tra cứu bảo mật PII:
            </span>
            <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">Nhập Mã Vận Đơn + 4 số cuối SĐT người nhận để xem toàn bộ hành trình</span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 mt-8 border-t-2 border-slate-200/80 dark:border-slate-800/80 relative z-10">
          <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-200/80 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="stat-number text-2xl font-black text-slate-900 dark:text-white tracking-tight">&lt; 3 Sec</div>
              <div className="stat-label text-xs font-bold text-slate-600 dark:text-slate-400">Thời Gian Lập Route AI</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-cyan-200/80 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white shadow-md shadow-cyan-600/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Thermometer className="w-6 h-6" />
            </div>
            <div>
              <div className="stat-number text-2xl font-black text-slate-900 dark:text-white tracking-tight">2 - 8°C</div>
              <div className="stat-label text-xs font-bold text-slate-600 dark:text-slate-400">Kiểm Soát Chuẩn Cold Chain</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-200/80 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="stat-number text-2xl font-black text-slate-900 dark:text-white tracking-tight">100% Audit</div>
              <div className="stat-label text-xs font-bold text-slate-600 dark:text-slate-400">Nhật Ký & Khóa Bảo Mật</div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Live Trackings Horizontal List Section (Chỉ hiển thị danh sách khi ĐÃ ĐĂNG NHẬP) */}
      {user && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Vận Đơn Đang Chuyển Động Hàng Ngày</h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline">
                Nhấn Chi Tiết / Sửa / Hủy để quản lý vận đơn
              </span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${viewMode === 'table' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  title="Bảng Ngang Đầy Đủ"
                >
                  <LayoutList className="w-4 h-4" />
                  <span className="text-xs">Bảng Ngang</span>
                </button>
                <button
                  onClick={() => setViewMode('bar')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${viewMode === 'bar' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
              <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">MÃ VẬN ĐƠN</th>
                        <th className="py-3.5 px-4">NGƯỜI NHẬN & NƠI GIAO</th>
                        <th className="py-3.5 px-4">TRỌNG LƯỢNG (THỰC / DIM)</th>
                        <th className="py-3.5 px-4">CƯỚC PHÍ</th>
                        <th className="py-3.5 px-4">TRẠNG THÁI</th>
                        <th className="py-3.5 px-4 text-right">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-xs">
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
                        const isUnprepared = ['CREATED', 'PENDING_VERIFICATION', 'PENDING', 'DRAFT'].includes(ord.status);
                        const elapsed = ord.createdAt ? Math.floor((Date.now() - new Date(ord.createdAt).getTime()) / 1000) : 0;
                        const isEditable = isUnprepared && elapsed < 300;

                        return (
                          <tr key={ord._id || ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="py-4 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                              <button
                                onClick={() => onOpenOrderDetails(ord)}
                                className="hover:underline cursor-pointer text-left"
                              >
                                {code}
                              </button>
                              <span className="block text-[10px] font-normal text-slate-500">{ord.serviceType || 'EXPRESS'}</span>
                            </td>

                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{recipientName}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{recipientAddress}</div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="text-slate-800 dark:text-slate-200 font-mono">{actualWeight} kg (Thực)</div>
                              <div className="text-cyan-700 dark:text-cyan-400 text-[11px] font-mono">➡ {chargeableWeightVal} kg (Tính cước)</div>
                            </td>

                            <td className="py-4 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {fee.toLocaleString('vi-VN')} đ
                            </td>

                            <td className="py-4 px-4">
                              <span
                                className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${ord.status === 'CANCELLED'
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  : ord.status === 'DELIVERED'
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : ord.status === 'IN_TRANSIT' || ord.status === 'OUT_FOR_DELIVERY'
                                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                      : 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                  }`}
                              >
                                {ord.status}
                              </span>
                            </td>

                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => onOpenOrderDetails(ord)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-600/20 dark:hover:bg-blue-600 dark:text-blue-300 dark:hover:text-white border border-blue-300 dark:border-blue-500/30 text-xs font-semibold transition cursor-pointer"
                                  title="Xem chi tiết vận đơn"
                                >
                                  Chi Tiết
                                </button>

                                {isEditable && onEditOrder && (
                                  <button
                                    onClick={() => onEditOrder(ord)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white dark:bg-amber-500/20 dark:hover:bg-amber-600 dark:text-amber-300 dark:hover:text-white border border-amber-300 dark:border-amber-500/30 text-xs font-semibold transition cursor-pointer"
                                    title="Chỉnh sửa đơn hàng"
                                  >
                                    Sửa
                                  </button>
                                )}

                                {isEditable && onCancelOrder && (
                                  <button
                                    onClick={() => onCancelOrder(ord)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white dark:bg-rose-500/20 dark:hover:bg-rose-600 dark:text-rose-300 dark:hover:text-white border border-rose-300 dark:border-rose-500/30 text-xs font-semibold transition cursor-pointer"
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
                  const isUnprepared = ['CREATED', 'PENDING_VERIFICATION', 'PENDING', 'DRAFT'].includes(ord.status);
                  const elapsed = ord.createdAt ? Math.floor((Date.now() - new Date(ord.createdAt).getTime()) / 1000) : 0;
                  const isEditable = isUnprepared && elapsed < 300;

                  return (
                    <div
                      key={ord._id || ord.id}
                      className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition group flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm dark:shadow-lg"
                    >
                      {/* Left: Code & Service */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-500/20">
                          {code}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${ord.status === 'DELIVERED'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : ord.status === 'IN_TRANSIT' || ord.status === 'OUT_FOR_DELIVERY'
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30'
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
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                          {origin} ➔ {dest}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          Người nhận: <span className="text-slate-900 dark:text-slate-200 font-semibold">{recipientName}</span>
                        </p>
                      </div>

                      {/* Right: Weight, Fee & Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800">
                        <div className="text-left md:text-right text-xs">
                          <div className="text-slate-600 dark:text-slate-400">TL: <strong className="text-slate-900 dark:text-white">{weight} kg</strong></div>
                          {fee > 0 && <div className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{fee.toLocaleString('vi-VN')} đ</div>}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenOrderDetails(ord)}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-600/20 dark:hover:bg-blue-600 dark:text-blue-300 dark:hover:text-white border border-blue-300 dark:border-blue-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                          >
                            Chi Tiết <ArrowRight className="w-3 h-3" />
                          </button>
                          {isEditable && onEditOrder && (
                            <button
                              onClick={() => onEditOrder(ord)}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white dark:bg-amber-500/20 dark:hover:bg-amber-600 dark:text-amber-300 dark:hover:text-white border border-amber-300 dark:border-amber-500/30 text-xs font-bold transition cursor-pointer"
                            >
                              Sửa
                            </button>
                          )}
                          {isEditable && onCancelOrder && (
                            <button
                              onClick={() => onCancelOrder(ord)}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white dark:bg-rose-500/20 dark:hover:bg-rose-600 dark:text-rose-300 dark:hover:text-white border border-rose-300 dark:border-rose-500/30 text-xs font-bold transition cursor-pointer"
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
            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Package className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-300">Chưa có vận đơn nào trong CSDL MongoDB</p>
              <p className="text-xs text-slate-500">Các vận đơn vừa khởi tạo sẽ xuất hiện tại đây theo thời gian thực.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
