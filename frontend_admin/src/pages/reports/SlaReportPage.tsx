import React from 'react';
import { BarChart3, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export const SlaReportPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-2xl font-black text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-cyan-400" /> Báo Cáo Hiệu Suất SLA & Vận Hành
        </h3>
        <p className="text-xs text-slate-400">Phân tích tỷ lệ giao đúng hẹn, thời gian xử lý sự cố & chỉ số hài lòng</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tỷ Lệ Giao Đúng Giờ (SLA)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">99.4%</div>
          <p className="text-[10px] text-slate-500">Mục tiêu hệ thống: &gt; 98.0%</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Thời Gian Lập Tuyến Trung Bình</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-400 font-mono">0.38 s</div>
          <p className="text-[10px] text-slate-500">Thuật toán AI Route Optimization</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tỷ Lệ Đơn Sai Tuyến (Misrouted)</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-400">0.02%</div>
          <p className="text-[10px] text-slate-500">Tự động phát hiện & sửa sai trong 5 phút</p>
        </div>
      </div>
    </div>
  );
};
