import React from 'react';
import { Truck, Shield, Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full glass-panel border-t border-slate-800/80 pt-12 pb-8 mt-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Truck className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-white">E-LOGISTIC</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nền tảng vận tải & chuỗi cung ứng thông minh áp dụng công nghệ AI tối ưu tuyến đường và tính cước tự động.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Dịch Vụ</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Vận Chuyển Hỏa Tốc Nội Thành</li>
              <li>Vận Tải Hàng Lạnh Cold Chain (2-8°C)</li>
              <li>Dịch Vụ Thu Hộ COD & Payout 24/7</li>
              <li>Kho Bãi & Hoàn Thiện Đơn Hàng</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Liên Hệ Bưu Cục</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Hub Tân Bình, TP. Hồ Chí Minh</li>
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-blue-400" /> 1900-888-999 (Hotline 24/7)</li>
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-blue-400" /> support@elogistic.vn</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Bảo Mật & Tiêu Chuẩn</h4>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-blue-400">
                <Shield className="w-4 h-4" /> Chuẩn Bảo Mật IATA
              </div>
              <p className="text-[11px] text-slate-400">Tự động tính cước thể tích DIM theo tiêu chuẩn Hiệp hội Vận tải Hàng không Quốc tế.</p>
            </div>
          </div>

        </div>

        <div className="border-t border-slate-800/80 pt-6 text-center text-xs text-slate-500">
          <p>© 2026 E-Logistic Web Platform. Hệ Thống Quản Lý Logistics Khách Hàng & Seller.</p>
        </div>
      </div>
    </footer>
  );
};
