import React from 'react';
import { NavLink } from 'react-router';
import { LayoutDashboard, Package, Truck, Users, ShieldAlert, BarChart3, LogOut, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { UserRole } from '@/types/auth.types';

export const AdminSidebar: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const userRole = (user?.role || '').toString();

    {
      to: '/warehouse/inbound',
      label: 'Quét Nhập Kho (UC-16)',
      icon: Package,
      roles: [UserRole.ADMIN, UserRole.WAREHOUSE_STAFF, UserRole.HUB_STAFF, UserRole.HUB_COORDINATOR],
    },
    {
      to: '/warehouse/outbound',
      label: 'Quét Xuất Kho (UC-17)',
      icon: Truck,
      roles: [UserRole.ADMIN, UserRole.WAREHOUSE_STAFF, UserRole.HUB_STAFF, UserRole.HUB_COORDINATOR],
    },
    {
      to: '/warehouse/audit',
      label: 'Kiểm Kê Kho (UC-18)',
      icon: ClipboardCheck,
      roles: [UserRole.ADMIN, UserRole.WAREHOUSE_STAFF, UserRole.HUB_STAFF, UserRole.HUB_COORDINATOR],
    },
    {
      to: '/driver/pickup',
      label: 'Driver Pickup PWA (UC-12)',
      icon: Truck,
      roles: [UserRole.ADMIN, UserRole.DRIVER, UserRole.LINE_HAUL_DRIVER],
    },
    {
      to: '/admin/dashboard',
      label: 'Tổng Quan Operations',
      icon: LayoutDashboard,
      roles: [UserRole.ADMIN, UserRole.OPERATIONS, UserRole.DISPATCHER, UserRole.HUB_COORDINATOR],
    },
    {
      to: '/admin/orders',
      label: 'Global Order List',
      icon: Package,
      roles: [
        UserRole.ADMIN,
        UserRole.OPERATIONS,
        UserRole.DISPATCHER,
        UserRole.WAREHOUSE_STAFF,
        UserRole.HUB_STAFF,
        UserRole.ACCOUNTANT,
        UserRole.CS,
        UserRole.CUSTOMER_SERVICE,
      ],
    },
    {
      to: '/admin/dispatch',
      label: 'Điều Phối Vận Tải (Dispatch)',
      icon: Truck,
      roles: [UserRole.ADMIN, UserRole.OPERATIONS, UserRole.DISPATCHER],
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
    {
      to: '/admin/reports',
      label: 'Báo Cáo Tỷ Lệ SLA & Vận Hành',
      icon: BarChart3,
      roles: [UserRole.ADMIN, UserRole.OPERATIONS],
    },

  const visibleNavItems = navItems.filter(
    (item) => (item.roles as string[]).includes(userRole) || userRole === UserRole.ADMIN
  );

  return (
    <aside className="w-64 bg-slate-950/90 border-r border-slate-800 p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-cyan-500/20">
            E
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wider">Mission Control</h1>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest block">Pharma Logistics v2.4</span>
          </div>
        </div>

        <nav className="space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-800 space-y-3">
        {user && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                {user.fullName}
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              {user.role} • {user.department || 'Bộ phận vận hành'}
            </span>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Đăng Xuất Hệ Thống
        </button>
      </div>
    </aside>
  );
};

