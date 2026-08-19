import { Truck, Heart, MapPin, Phone, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full glass-panel border-t border-slate-800/80 mt-20 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white">
                <Truck className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg text-white">E-LOGISTIC</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hệ thống vận tải & logistics chuỗi cung ứng thông minh. Đồ án khóa luận E-Logistic 2026.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Hệ Thống Hoạt Động 99.99% (12ms)
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Dịch Vụ Logistics</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><a href="#" className="hover:text-blue-400 transition">Vận Chuyển Hỏa Tốc Dược Phẩm</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">Chuỗi Lạnh Cold Chain (2-8°C)</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">Vận Tải Hàng Nặng Đường Dài</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">Kho Trung Chuyển & Phân Loại</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Kiến Trúc & Bảo Mật</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><a href="#" className="hover:text-blue-400 transition">Tính Cước Trọng Lượng Quy Đổi</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">Thuật Toán Phân Tuyến AI Route</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">Tự Động Khóa Khi Sai 5 Lần</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">Audit Logs & JWT Refresh Tokens</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Liên Hệ Bưu Cục Hub</h4>
            <div className="text-slate-400 space-y-1.5">
              <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" /> Kho Hub Trung Tâm: Q. Tân Bình, TP. Hồ Chí Minh</p>
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Hotline Hỗ Trợ 24/7: 1900 8894</p>
              <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Email: support@elogistic.vn</p>
            </div>
          </div>
        </div>

        {/* Bottom credits */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 E-Logistic Platform. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center gap-1">
            <span>Thiết kế & phát triển cho Khoa Luận K18 với</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
          </div>
        </div>

      </div>
    </footer>
  );
};
