import React from 'react';
import { BarChart3, CheckCircle2, AlertTriangle, Clock, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

export const SlaReportPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      {/* TẦNG 1: Page Header & KPI Summary Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Báo Cáo Tỷ Lệ SLA &amp; Vận Hành</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Phân tích tỷ lệ giao đúng hẹn, thời gian xử lý sự cố &amp; chỉ số hài lòng vận tải toàn hệ thống
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" /> Tải Lại Báo Cáo
            </button>
          </div>
        </div>

        {/* 4 Thẻ KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tỷ Lệ Giao Đúng Hẹn</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">99.4%</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Thời Gian Lập Tuyến</span>
              <span className="text-2xl font-black text-cyan-400 mt-1 block font-mono">0.38 s</span>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tỷ Lệ Sai Tuyến</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block font-mono">0.02%</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Điểm Khách Hàng (CSAT)</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block font-mono">4.92 / 5.0</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Chi Tiết Báo Cáo SLA & Chỉ Số Vận Hành */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" /> Chỉ Số Cam Kết Chất Lượng Dịch Vụ (SLA Benchmark)
          </h2>
          <span className="text-xs text-slate-400 font-mono">Cập nhật tự động 5 phút / lần</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">SLA Lấy Hàng Tại Khởi Điểm</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400">Đạt Chuẩn</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">98.9%</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '98.9%' }} />
            </div>
            <p className="text-[11px] text-slate-400">Mục tiêu hệ thống: &ge; 97.5% trong vòng 2h</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">SLA Trung Chuyển Liên Bưu Cục</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400">Đạt Chuẩn</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">99.7%</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full rounded-full" style={{ width: '99.7%' }} />
            </div>
            <p className="text-[11px] text-slate-400">Tối ưu chặng đường với AI Line-haul Routing</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">SLA Giao Hàng Cuối (Last-Mile)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400">Đạt Chuẩn</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">99.1%</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: '99.1%' }} />
            </div>
            <p className="text-[11px] text-slate-400">Giám sát theo dõi bởi Geozone Coordinator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

