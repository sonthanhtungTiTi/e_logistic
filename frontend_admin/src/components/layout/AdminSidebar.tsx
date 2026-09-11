import React from 'react';
import { NavLink } from 'react-router';
import { LayoutDashboard, Package, Truck, Users, ShieldAlert, BarChart3, LogOut, ShieldCheck, Compass, Building2 } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { usePendingKycCount } from '../../hooks/usePendingKycCount';
import { UserRole } from '@/types/auth.types';
import { ThemeToggleButton } from '../common/ThemeToggleButton';

export const AdminSidebar: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const { pendingCount } = usePendingKycCount();
  const userRole = (user?.role || '').toString();

  // ─── Chỉ menu QUẢN TRỊ — không có Nhập/Xuất/Đóng bao kho ───────────────────
  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Tổng Quan Operations',
      icon: LayoutDashboard,
      roles: [UserRole.ADMIN, UserRole.OPERATIONS, UserRole.DISPATCHER, UserRole.HUB_COORDINATOR],
    },
    {
      to: '/admin/orders',
      label: 'Tất Cả Đơn Hàng (Global List)',
      icon: Package,
      roles: [
        UserRole.ADMIN,
        UserRole.OPERATIONS,
        UserRole.DISPATCHER,
        UserRole.ACCOUNTANT,
        UserRole.CS,
        UserRole.CUSTOMER_SERVICE,
      ],
    },
    {
      to: '/admin/vendor-ops',
      label: 'Duyệt Đơn & NCC (QL 1)',
      icon: Building2,
      roles: [UserRole.ADMIN, UserRole.ORDER_VENDOR_MANAGER, UserRole.OPERATIONS, UserRole.DISPATCHER],
    },
    {
      to: '/admin/dispatch/local',
      label: 'Điều Phối Shipper (QL 2)',
      icon: Compass,
      roles: [UserRole.ADMIN, UserRole.LAST_MILE_DISPATCHER, UserRole.DISPATCHER, UserRole.OPERATIONS],
    },
    {
      to: '/admin/dispatch/linehaul',
      label: 'Điều Phối Xe Tải (QL 3)',
      icon: Truck,
      roles: [UserRole.ADMIN, UserRole.LINE_HAUL_DISPATCHER, UserRole.DISPATCHER, UserRole.OPERATIONS],
    },
    {
      to: '/admin/kyc',
      label: 'Xác Minh Danh Tính (KYC)',
      icon: ShieldCheck,
      roles: [UserRole.ADMIN, UserRole.CS, 'ADMIN', 'CS'],
    },
    {
      to: '/admin/reports',
      label: 'Báo Cáo Tỷ Lệ SLA & Vận Hành',
      icon: BarChart3,
      roles: [UserRole.ADMIN, UserRole.OPERATIONS],
    },
    {
      to: '/admin/users',
      label: 'Quản Lý Người Dùng & Khóa',
      icon: Users,
      roles: [UserRole.ADMIN],
    },
    {
      to: '/admin/security',
      label: 'Bảo Mật & Audit Log 2-Lớp',
      icon: ShieldAlert,
      roles: [UserRole.ADMIN],
    },
  ];

  // Lọc theo role — KHÔNG dùng "ADMIN thấy tất cả" fallback nữa
  const visibleNavItems = navItems.filter(
    (item) => (item.roles as string[]).includes(userRole)
  );


  return (
    <aside className="w-64 bg-slate-950/90 border-r border-slate-800 p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <img src="/logo.png" alt="GIAO HÀNG Logo" className="h-11 w-auto object-contain shrink-0 drop-shadow-sm" />
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-wider text-color-blue">GIAO HÀNG</h1>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-widest block"> tận tay bạn!</span>
          </div>
        </div>

        <nav className="space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isKycItem = item.to === '/admin/kyc';
            const hasPendingKyc = isKycItem && pendingCount > 0;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${isActive
                    ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-900/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>

                {hasPendingKyc && (
                  <div className="flex items-center gap-1.5 ml-auto pl-2">
                    {/* Dấu chấm đỏ nhấp nháy báo hiệu hồ sơ mới */}
                    <span className="relative flex h-2 w-2" title={`${pendingCount} hồ sơ KYC mới đang chờ thẩm định`}>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    {/* Badge đếm số lượng hồ sơ PENDING */}
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm shadow-rose-500/40 leading-none"
                      title={`${pendingCount} hồ sơ đang chờ duyệt`}
                    >
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        {/* Nút chuyển đổi Theme nổi bật trong Sidebar */}
        <div className="p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Giao diện:</span>
          <ThemeToggleButton showLabel className="py-1 px-2.5 text-[11px]" />
        </div>

        {user && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                {user.fullName}
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
              {user.role} • {user.department || 'Bộ phận vận hành'}
            </span>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-500/15 text-slate-700 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Đăng Xuất Hệ Thống
        </button>
      </div>
    </aside>
  );
};
