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
    <aside className="w-64 bg-slate-950/90 border-r border-slate-800 p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20">
            W
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wider">Kho Vận</h1>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">
              Warehouse Operations
            </span>
          </div>
        </div>

        {/* Hub info badge */}
        {user?.hubId && (
          <div className="px-2">
            <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-semibold">
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
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-inner'
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

      {/* User info + Logout */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        {user && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                {user.fullName}
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              {user.role} • {user.department || 'Bộ phận kho vận'}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Đăng Xuất
        </button>
      </div>
    </aside>
  );
};

export default WarehouseSidebar;
