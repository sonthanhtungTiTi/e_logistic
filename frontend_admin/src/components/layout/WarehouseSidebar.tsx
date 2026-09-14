import React from 'react';
import { NavLink } from 'react-router';
import {
  Package, Boxes, Truck, ClipboardCheck,
  BarChart3, LogOut, ShieldCheck, PackageOpen,
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { UserRole } from '@/types/auth.types';

const warehouseNavItems = [
  {
    to: '/warehouse/inbound',
    label: 'Nhập Kho (Inbound)',
    icon: Package,
    roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR],
  },
  {
    to: '/warehouse/bagging',
    label: 'Gom Bao & Niêm Phong',
    icon: Boxes,
    roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR],
  },
  {
    to: '/warehouse/outbound',
    label: 'Xuất Kho (Outbound)',
    icon: Truck,
    roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR],
  },
  {
    to: '/warehouse/audit',
    label: 'Kiểm Kê Kho',
    icon: ClipboardCheck,
    roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR],
  },
  {
    to: '/warehouse/inventory',
    label: 'Tồn Kho & Dashboard',
    icon: BarChart3,
    roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR],
  },
  {
    to: '/admin/orders',
    label: 'Tra Cứu Đơn Hàng',
    icon: PackageOpen,
    roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR],
  },
];

export const WarehouseSidebar: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const userRole = (user?.role || '').toString();

  const visibleItems = warehouseNavItems.filter(item =>
    (item.roles as string[]).includes(userRole)
  );

  return (
    <aside className="w-64 bg-white/90 dark:bg-slate-950/90 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2">
          <img src="/logo.png" alt="Giao hàng siêu tốc Logo" className="h-11 w-auto object-contain shrink-0 drop-shadow-sm" />
          <div>
            <h1 className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-wider">Giao hàng siêu tốc</h1>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest block">
              Bộ Phận Kho Vận & Phân Loại
            </span>
          </div>
        </div>

        {/* Hub info badge */}
        {user?.hubId && (
          <div className="px-2">
            <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-300 font-semibold">
              📦 Hub: {user.hubId}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60 font-medium'
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

      {/* User info + Logout */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        {user && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                {user.fullName}
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
              {user.role} • {user.department || 'Bộ phận kho vận'}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-500/15 text-slate-700 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Đăng Xuất
        </button>
      </div>
    </aside>
  );
};

export default WarehouseSidebar;
