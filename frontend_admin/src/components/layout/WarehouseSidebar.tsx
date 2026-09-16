import React from 'react';
import { NavLink } from 'react-router';
import {
  Package, Boxes, Truck, ClipboardCheck,
  BarChart3, PackageOpen,
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
  const { user } = useAdminAuth();
  const userRole = (user?.role || '').toString();

  const visibleItems = warehouseNavItems.filter(item =>
    (item.roles as string[]).includes(userRole)
  );

  return (
    <aside className="w-64 bg-white/90 dark:bg-slate-950/90 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col hidden md:flex shrink-0 sticky top-0 h-screen overflow-y-auto self-start z-30">
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
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition group ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
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
    </aside>
  );
};

export default WarehouseSidebar;
