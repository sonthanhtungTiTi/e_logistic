import React, { useState } from 'react';
import { Calculator } from '../../components/shared/Calculator';
import {
  Calculator as CalcIcon,
  ShieldCheck,
  Zap,
  ThermometerSnowflake,
  Truck,
  Check,
  ArrowRight,
  Percent,
  Award,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'CALCULATOR' | 'RATES' | 'TIERS' | 'ADDONS'>('CALCULATOR');

  const rateCards = [
    {
      icon: <Zap className="w-6 h-6 text-blue-400" />,
      name: 'Nội Tỉnh Hỏa Tốc',
      deliveryTime: '6h - 12h',
      basePrice: '22.000đ',
      weightIncluded: 'Đến 2kg',
      nextKgPrice: '+3.500đ / kg',
      desc: 'Áp dụng khu vực nội thành TP.HCM, Hà Nội, Đà Nẵng. Giao siêu tốc trong ngày.',
      badge: 'Phổ biến nhất',
      color: 'from-blue-600/20 to-sky-600/10 border-blue-500/30',
    },
    {
      icon: <Truck className="w-6 h-6 text-blue-400" />,
      name: 'Liên Tỉnh Tiêu Chuẩn',
      deliveryTime: '24h - 48h',
      basePrice: '32.000đ',
      weightIncluded: 'Đến 1kg',
      nextKgPrice: '+5.000đ / kg',
      desc: 'Tối ưu chi phí cho đơn hàng bán lẻ Thương mại điện tử toàn quốc.',
      badge: 'Tiết kiệm',
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30',
    },
    {
      icon: <ThermometerSnowflake className="w-6 h-6 text-cyan-400" />,
      name: 'Cold-Chain Dược Phẩm (2-8°C)',
      deliveryTime: '12h - 24h',
      basePrice: '55.000đ',
      weightIncluded: 'Đến 1kg',
      nextKgPrice: '+10.000đ / kg',
      desc: 'Vận chuyển bằng xe lạnh chuyên dụng kiểm soát nhiệt độ đạt chuẩn GSP/GDP Bộ Y Tế.',
      badge: 'Chuyên dụng Y Tế',
      color: 'from-cyan-500/20 to-teal-500/10 border-cyan-500/30',
    },
    {
      icon: <Layers className="w-6 h-6 text-sky-400" />,
      name: 'Hàng Khối Lượng Lớn (LTL)',
      deliveryTime: '48h - 72h',
      basePrice: '18.000đ / kg',
      weightIncluded: 'Từ 50kg trở lên',
      nextKgPrice: 'Giảm giá theo lô',
      desc: 'Vận chuyển hàng nguyên lô, pallet kho vận với cước phí cực ưu đãi cho Doanh nghiệp.',
      badge: 'B2B Wholesale',
      color: 'from-sky-600/20 to-blue-600/10 border-sky-500/30',
    },
  ];

  const sellerTiers = [
    {
      tier: 'Hạng Đồng (Standard)',
      orders: '< 50 đơn / ngày',
      discount: '0%',
      benefits: ['Giá cước niêm yết tiêu chuẩn', 'Miễn phí thu hộ COD dưới 3.000.000đ', 'Quản lý đơn hàng trên Web & App'],
      color: 'border-slate-700 bg-slate-900/40',
    },
    {
      tier: 'Hạng Bạc (Silver)',
      orders: '50 - 200 đơn / ngày',
      discount: 'Giảm 5% Cước',
      benefits: ['Chiết khấu 5% toàn bộ cước phí', 'Ưu tiên lấy hàng tại kho đúng giờ', 'Hỗ trợ đối soát COD 3 lần / tuần'],
      color: 'border-slate-500/40 bg-slate-800/40',
    },
    {
      tier: 'Hạng Vàng (Gold)',
      orders: '200 - 1.000 đơn / ngày',
      discount: 'Giảm 12% Cước',
      benefits: ['Chiết khấu 12% toàn bộ cước phí', 'Miễn phí lưu kho GSP 7 ngày', 'Đối soát COD hàng ngày T+1', 'Quản lý tài khoản riêng (Key Account Manager)'],
      color: 'border-blue-500/40 bg-blue-950/20',
    },
    {
      tier: 'Hạng Bạch Kim (Platinum)',
      orders: '> 1.000 đơn / ngày',
      discount: 'Giảm 20% Cước',
      benefits: ['Chiết khấu 20% toàn bộ cước phí', 'Miễn phí lấy hàng tận nơi không giới hạn', 'Cam kết SLA đền bù 100% giá trị hàng', 'Tùy chỉnh kết nối API ERP/POS'],
      color: 'border-cyan-500/50 bg-cyan-950/30 shadow-cyan-500/10 shadow-xl',
      featured: true,
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Bảng Giá & Ước Tính Cước Phí
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto">
          Tra cứu bảng cước niêm yết hoặc nhập thông số kiện hàng để tính toán cước phí vận chuyển chính xác tức thì.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-1.5 shadow-sm">
          {[
            { id: 'CALCULATOR', label: 'Tính Cước Nhanh', icon: <CalcIcon className="w-4 h-4" /> },
            { id: 'RATES', label: 'Bảng Giá Niêm Yết', icon: <Truck className="w-4 h-4" /> },
            { id: 'TIERS', label: 'Chiết Khấu Đại Lý', icon: <Percent className="w-4 h-4" /> },
            { id: 'ADDONS', label: 'Chính Sách & Phụ Phí', icon: <ShieldCheck className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: CALCULATOR */}
      {activeTab === 'CALCULATOR' && (
        <div className="animate-in fade-in duration-300">
          <Calculator
            onApplyToNewOrder={() => {
              navigate('/seller/orders/create');
            }}
          />
        </div>
      )}

      {/* TAB 2: RATES LIST */}
      {activeTab === 'RATES' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rateCards.map((card, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 relative overflow-hidden flex flex-col justify-between shadow-sm dark:shadow-xl hover:border-blue-500/40 transition group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700/60">
                      {card.icon}
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-slate-800/80 dark:border-slate-700 dark:text-cyan-300">
                      {card.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{card.name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{card.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{card.basePrice}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">/ đơn</span>
                    </div>
                    <div className="text-right text-xs text-slate-700 dark:text-slate-300 font-semibold">
                      <div>Thời gian: <span className="text-blue-600 dark:text-cyan-400 font-bold">{card.deliveryTime}</span></div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{card.weightIncluded}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40">
                  <span>Cước kg tiếp theo: <strong className="text-slate-900 dark:text-slate-200 font-semibold">{card.nextKgPrice}</strong></span>
                  <button
                    onClick={() => navigate('/seller/orders/create')}
                    className="text-blue-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Tạo đơn ngay <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PARTNER DISCOUNTS */}
      {activeTab === 'TIERS' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Phân Hạng Khách Hàng & Mức Chiết Khấu Cước
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Thuật toán hệ thống tự động tổng hợp sản lượng đơn hàng cuối tháng để áp dụng chính sách chiết khấu trực tiếp vào ví COD.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sellerTiers.map((t, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between relative shadow-sm dark:shadow-xl hover:border-blue-500/40 transition"
              >
                {t.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-[10px] uppercase shadow-md">
                    Gói VIP Tốt Nhất
                  </div>
                )}

                <div className="space-y-3">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-300">{t.tier}</div>
                  <div className="text-2xl font-black text-blue-600 dark:text-cyan-300 font-mono">{t.discount}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Sản lượng: <strong className="text-slate-900 dark:text-white">{t.orders}</strong></div>

                  <ul className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    {t.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  Đăng Ký Khách Hàng Doanh Nghiệp
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ADDONS & SURCHARGES */}
      {activeTab === 'ADDONS' && (
        <div className="bg-white dark:bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm dark:shadow-xl animate-in fade-in duration-300">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Bảng Phụ Phí Minh Bạch & Bảo Hiểm Hàng Hóa
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                <span>1. Phí Thu Hộ (COD)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">Miễn Phí</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Miễn phí thu hộ 100% đối với các đơn hàng giá trị COD dưới 3.000.000đ. Đơn hàng từ 3.000.000đ trở lên áp dụng 0.5% giá trị thu hộ.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                <span>2. Bảo Hiểm & Khai Giá Hàng Hóa</span>
                <span className="text-blue-600 dark:text-cyan-400 font-mono font-bold">0.5% Hàng Giá Trị</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Đơn hàng dưới 1.000.000đ được đền bù mặc định tối đa 4 lần cước phí. Khai giá hàng hóa trên 1tr đền bù 100% khi có sự cố.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                <span>3. Phí Hoàn Hàng Về Kho Seller</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono font-bold">50% Cước Lượt Đi</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Hệ thống tự động phát hàng 3 lần trước khi chuyển sang trạng thái Hoàn Hàng. Cước phí hoàn hàng tính 50% cước giao ban đầu.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                <span>4. Phí Bảo Quản Mát Dược Phẩm</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">Bao gồm trong Cold-Chain</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Miễn phí theo dõi nhiệt độ GPS 24/7 và cảnh báo biến đổi nhiệt độ từ 2°C - 8°C qua SMS/App notification.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

