import React from 'react';
import { Activity, Cpu, Truck, CheckCircle2, ShieldCheck, Zap, Server } from 'lucide-react';
import type { Order, UserAccount, AuditLog } from '../../types';

interface OperationsOverviewProps {
  orders: Order[];
  users: UserAccount[];
  auditLogs: AuditLog[];
  onNavigateTab?: (tab: string) => void;
}

export const OperationsOverview: React.FC<OperationsOverviewProps> = ({
  orders,
  users,
  auditLogs,
  onNavigateTab,
}) => {
  const activeOrdersCount = orders.filter((o) => o.status !== 'DELIVERED').length;
  const lockedUsersCount = users.filter((u) => !u.isActive).length;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Operations & Command Center
          </div>
          <h2 className="text-3xl font-extrabold text-white">Giám Sát Vận Hành Chuỗi Cung Ứng Real-Time</h2>
          <p className="text-xs text-slate-400">Hệ thống điều phối xe hỏa tốc, kho vận Hub & Nhật ký an toàn thông tin</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs flex items-center gap-3">
            <Server className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <div className="text-slate-200 font-bold">API Gateway Status: 100%</div>
              <div className="text-[10px] text-slate-400">Latency: 14ms • DB Pool: 8/50</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Đơn Đang Luân Chuyển</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{activeOrdersCount} <span className="text-xs text-slate-400 font-normal">vận đơn</span></div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Nhân Sự & Đội Xe</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300">{users.length} <span className="text-xs text-slate-400 font-normal">tài khoản</span></div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Cảnh Báo Khóa Tài Khoản</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400">{lockedUsersCount} <span className="text-xs text-slate-400 font-normal">user bị khóa</span></div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Nhật Ký Thao Tác Logs</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{auditLogs.length} <span className="text-xs text-slate-400 font-normal">sự kiện</span></div>
        </div>
      </div>

      {/* Fleet AI Route Radar Visualizer */}
      <div className="glass-panel rounded-3xl border border-slate-800 p-6 space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Bản Đồ Phân Tuyến Xe Tải Lạnh & Hàng Hóa AI (Live GPS Radar)
            </h3>
            <p className="text-xs text-slate-400">Đang theo dõi 142 container & xe phát hàng hỏa tốc toàn quốc</p>
          </div>
          <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Live Sync 60fps
          </span>
        </div>

        {/* Map Visualizer Container */}
        <div className="h-64 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex items-center justify-center">
          {/* Background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30"></div>
          
          {/* Animated route pulse lines */}
          <svg className="absolute inset-0 w-full h-full stroke-cyan-500/40 fill-none" strokeWidth="2">
            <path d="M 120 180 Q 250 80 400 120 T 650 90" strokeDasharray="6 6" className="animate-pulse" />
            <path d="M 150 190 Q 300 220 500 160 T 700 200" strokeDasharray="4 4" />
          </svg>

          {/* Node cities */}
          <div className="absolute left-[15%] top-[65%] flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 animate-ping"></div>
            <div className="w-3 h-3 rounded-full bg-blue-400 absolute"></div>
            <span className="text-xs font-bold text-white bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700">Kho Hub Nam (TP.HCM)</span>
          </div>

          <div className="absolute left-[45%] top-[35%] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
            <span className="text-xs font-bold text-white bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700">Kho Trung Chuyển Đà Nẵng</span>
          </div>

          <div className="absolute right-[20%] top-[25%] flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-indigo-500 animate-ping"></div>
            <div className="w-3 h-3 rounded-full bg-indigo-400 absolute"></div>
            <span className="text-xs font-bold text-white bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700">Kho Hub Bắc (Hà Nội)</span>
          </div>

          <div className="absolute z-10 text-center space-y-1">
            <span className="text-xs font-bold text-slate-300 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700 shadow-xl">
              🚦 AI đang tự động phân luồng 18 xe container lạnh tránh kẹt xe QL1A
            </span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigateTab && onNavigateTab('orders')}
          className="glass-card rounded-2xl p-6 border border-slate-800 cursor-pointer space-y-3 hover:border-purple-500/40"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-white">Quản Lý Đơn Hàng & Điều Phối</h4>
          <p className="text-xs text-slate-400">Giao vận đơn cho tài xế, xem mốc thời gian hành trình và cập nhật thông tin nhận hàng.</p>
          <span className="text-xs font-bold text-purple-400 inline-block pt-1">Mở Danh Sách Đơn ➔</span>
        </div>

        <div 
          onClick={() => onNavigateTab && onNavigateTab('users')}
          className="glass-card rounded-2xl p-6 border border-slate-800 cursor-pointer space-y-3 hover:border-purple-500/40"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-white">An Ninh Tài Khoản & Lockout</h4>
          <p className="text-xs text-slate-400">Kiểm tra các tài khoản bị khóa do nhập sai mật khẩu 5 lần. Chặn tự khóa tài khoản Admin.</p>
          <span className="text-xs font-bold text-rose-400 inline-block pt-1">Mở Bảng Khóa Bảo Mật ➔</span>
        </div>

        <div 
          onClick={() => onNavigateTab && onNavigateTab('audit')}
          className="glass-card rounded-2xl p-6 border border-slate-800 cursor-pointer space-y-3 hover:border-purple-500/40"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-white">Nhật Ký Thao Tác Audit Logs</h4>
          <p className="text-xs text-slate-400">Theo dõi toàn bộ các sự kiện thay đổi trạng thái, đăng nhập, đổi mật khẩu từ phía người dùng.</p>
          <span className="text-xs font-bold text-cyan-400 inline-block pt-1">Xem Audit Stream ➔</span>
        </div>
      </div>

    </div>
  );
};
