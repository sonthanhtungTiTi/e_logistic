import React from 'react';
import { NavLink } from 'react-router';
import { LayoutDashboard, Package, Truck, Users, ShieldAlert, BarChart3, ShieldCheck, Compass, Building2, DollarSign, Ticket } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { usePendingKycCount } from '../../hooks/usePendingKycCount';
import { UserRole } from '@/types/auth.types';

export const AdminSidebar: React.FC = () => {
  const { user } = useAdminAuth();
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
      to: '/admin/pricing',
      label: 'Bảng Giá & Voucher (CMS)',
      icon: DollarSign,
      roles: [UserRole.ADMIN, UserRole.OPERATIONS, UserRole.ACCOUNTANT, 'ADMIN'],
    },
    {
      to: '/admin/tickets',
      label: 'Khiếu Nại & CSKH (Ticket)',
      icon: Ticket,
      roles: [UserRole.ADMIN, UserRole.CS, UserRole.CUSTOMER_SERVICE, UserRole.OPERATIONS, 'ADMIN', 'CS'],
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
    <aside className="w-64 bg-white/90 dark:bg-slate-950/90 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col hidden md:flex shrink-0 sticky top-0 h-screen overflow-y-auto self-start z-30">
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <img src="/logo.png" alt="Giao hàng siêu tốc Logo" className="h-11 w-auto object-contain shrink-0 drop-shadow-sm" />
          <div>
            <h1 className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-wider">Giao hàng siêu tốc</h1>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest block"> tận tay bạn!</span>
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
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition group ${isActive
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>

                {hasPendingKyc && (
                  <div className="flex items-center gap-1.5 ml-auto pl-2">
                    <span className="relative flex h-2 w-2" title={`${pendingCount} hồ sơ KYC mới đang chờ thẩm định`}>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
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
    </aside>
  );
};

