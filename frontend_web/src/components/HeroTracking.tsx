import React, { useState } from 'react';
import { Search, ShieldCheck, Zap, Thermometer, ArrowRight, CheckCircle2, Sparkles, Navigation, MapPin } from 'lucide-react';
import type { Order } from '../types/order.types';
import heroBg from '../assets/hero_bg.png';

interface HeroTrackingProps {
  orders: Order[];
  onOpenOrderDetails: (order: Order) => void;
}

export const HeroTracking: React.FC<HeroTrackingProps> = ({
  orders,
  onOpenOrderDetails,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      setSearchError('Vui lòng nhập mã vận đơn (VD: VN-LOG-889421)');
      return;
    }
    const found = orders.find((o) => {
      const code = o.trackingCode || o.trackingNumber || '';
      return code.toLowerCase() === searchInput.trim().toLowerCase();
    });
    if (!found) {
      setSearchError(`Không tìm thấy mã vận đơn "${searchInput}". Thử mã demo bên dưới.`);
      return;
    }
    setSearchError('');
    onOpenOrderDetails(found);
  };

  const handleQuickClick = (code: string) => {
    setSearchInput(code);
    const found = orders.find((o) => (o.trackingCode || o.trackingNumber) === code);
    if (found) {
      setSearchError('');
      onOpenOrderDetails(found);
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Header Section */}
      <div className="relative min-h-[580px] rounded-3xl overflow-hidden glass-panel border border-slate-800 p-8 sm:p-12 lg:p-16 flex flex-col justify-between">

        {/* Background Image with Dark Glow Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroBg}
            alt="E-Logistic Global Network"
            className="w-full h-full object-cover opacity-25 mix-blend-luminosity scale-105 transition-transform duration-1000 hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-blue-950/60"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent"></div>
        </div>

        {/* Hero Top Content */}
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-wide uppercase shadow-inner">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            Nền Tảng Vận Tải Chuỗi Cung Ứng Thông Minh
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Vận Chuyển Hỏa Tốc & <br />
            <span className="glow-gradient-text">Tối Ưu Hóa Tuyến Đường AI</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg font-normal leading-relaxed">
            Hệ thống quản trị Logistics & Vận chuyển dược phẩm, hàng hóa tiêu chuẩn cao. Tính toán trọng lượng quy đổi tự động, theo dõi GPS thời gian thực và quản trị bảo mật 24/7.
          </p>

          {/* Interactive Search Bar */}
          <div className="pt-2">
            <form onSubmit={handleSearch} className="relative max-w-2xl">
              <div className="flex flex-col sm:flex-row items-stretch gap-2 p-2 rounded-2xl bg-slate-900/90 border border-blue-500/30 shadow-2xl backdrop-blur-md">
                <div className="flex-1 flex items-center gap-3 px-4 py-2">
                  <Search className="w-5 h-5 text-blue-400 shrink-0" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Nhập mã vận đơn (VD: VN-LOG-889421)..."
                    className="w-full bg-transparent text-white placeholder-slate-500 text-sm font-medium focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl shimmer-btn text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 hover:opacity-95 transition cursor-pointer"
                >
                  Tra Cứu Ngay
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {searchError && (
              <p className="text-rose-400 text-xs font-semibold mt-2 pl-2">
                ⚠️ {searchError}
              </p>
            )}

            {/* Demo tracking pills */}
            <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
              <span className="text-slate-400 font-semibold">Thử mã demo:</span>
              {orders.map((o) => {
                const code = o.trackingCode || o.trackingNumber || '';
                return (
                  <button
                    key={o._id || o.id}
                    onClick={() => handleQuickClick(code)}
                    className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-slate-700/60 font-mono transition cursor-pointer"
                  >
                    {code} ({o.serviceType || 'EXPRESS'})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hero Bottom Stats Banner */}
        <div className="relative z-10 pt-10 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">99.4%</div>
              <div className="text-xs text-slate-400">Tỷ Lệ Giao Đúng Giờ</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">&lt; 0.4 giây</div>
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

      {/* Recent Live Trackings Quick Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
            <h2 className="text-xl font-extrabold text-white">Vận Đơn Đang Chuyển Động Hàng Ngày</h2>
          </div>
          <span className="text-xs text-slate-400">Nhấn vào đơn để xem dòng thời gian chi tiết</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {orders.map((ord) => {
            const code = ord.trackingCode || ord.trackingNumber || '';
            const origin = ord.pickupAddress?.province || ord.originCity || 'N/A';
            const dest = ord.deliveryAddress?.province || ord.destinationCity || 'N/A';
            const recipientName = ord.deliveryAddress?.fullName || ord.recipientName || 'N/A';
            const weight = ord.chargeableWeight || ord.chargeableWeightKg || 0;

            return (
              <div
                key={ord._id || ord.id}
                onClick={() => onOpenOrderDetails(ord)}
                className="glass-card rounded-2xl p-5 cursor-pointer space-y-4 border border-slate-800 hover:border-blue-500/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                    {code}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${ord.status === 'DELIVERED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : ord.status === 'IN_TRANSIT' || ord.status === 'OUT_FOR_DELIVERY'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-700/50 text-slate-300'
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

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold truncate">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    {origin} ➔ {dest}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    Người nhận: <span className="text-slate-200">{recipientName}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>TL Quy Đổi: <strong className="text-white">{weight} kg</strong></span>
                  <span className="text-blue-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold">
                    Chi tiết <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Core Architecture Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Tính Cước Trọng Lượng Quy Đổi</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Áp dụng chính xác công thức Logistics chuẩn quốc tế $V = (L \times W \times H) / 5000$. Tự động so sánh với trọng lượng thực tế để lấy giá trị lớn nhất.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Navigation className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Tối Ưu Hóa Tuyến Đường AI</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Thuật toán phân tuyến thông minh giúp tài xế giảm 28% thời gian di chuyển, tự động gợi ý thứ tự bưu kiện cần giao và theo dõi tọa độ GPS 24/7.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Bảo Mật & Audit Log 2-Lớp</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Tự động tạm khóa tài khoản khi nhập sai 5 lần. Ghi nhận toàn bộ thao tác hệ thống (Audit Log) theo thời gian thực để ngăn ngừa gian lận dữ liệu.
          </p>
        </div>
      </div>

    </div>
  );
};
