import React from 'react';
import { Calculator } from '../../components/shared/Calculator';
import { Clock } from 'lucide-react';

export const PricingPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <Clock className="w-4 h-4" /> [BACKLOG MODULE]: Tính năng Bảng Giá Cố Định đang chờ bổ sung Use Case đặc tả riêng.
        </div>
        <span>Dưới đây là Công Cụ Tính Cước Quy Đổi DIM Chuẩn IATA</span>
      </div>

      <Calculator />
    </div>
  );
};
