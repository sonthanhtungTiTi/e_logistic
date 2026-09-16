import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { WarehouseSidebar } from '../components/layout/WarehouseSidebar';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { LogOut, Cpu, Menu, X, Package, Boxes, Truck, ClipboardCheck, BarChart3, PackageOpen } from 'lucide-react';
import { UserRole } from '@/types/auth.types';

const warehouseNavItems = [
  { to: '/warehouse/inbound', label: 'Nhập Kho (Inbound)', icon: Package, roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR] },
  { to: '/warehouse/bagging', label: 'Gom Bao & Niêm Phong', icon: Boxes, roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR] },
  { to: '/warehouse/outbound', label: 'Xuất Kho (Outbound)', icon: Truck, roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR] },
  { to: '/warehouse/audit', label: 'Kiểm Kê Kho', icon: ClipboardCheck, roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR] },
  { to: '/warehouse/inventory', label: 'Tồn Kho & Dashboard', icon: BarChart3, roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR] },
  { to: '/admin/orders', label: 'Tra Cứu Đơn Hàng', icon: PackageOpen, roles: [UserRole.HUB_STAFF, UserRole.WAREHOUSE_STAFF, UserRole.HUB_COORDINATOR] },
];

export const WarehouseLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userRole = (user?.role || '').toString();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const visibleItems = warehouseNavItems.filter(item =>
    (item.roles as string[]).includes(userRole)
  );

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-row selection:bg-blue-600 selection:text-white">
      <WarehouseSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 transition-all backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Mobile brand & toggle */}
            <div className="flex items-center gap-2.5 md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800"
                title="Mở menu kho vận"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <img src="/logo.png" alt="Giao hàng siêu tốc Logo" className="h-7 w-auto object-contain" />
              <span className="font-bold text-xs text-blue-400">Giao hàng siêu tốc KHO</span>
            </div>

            {/* Desktop breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-blue-400" /> Hệ Thống Kho Vận & Tác Nghiệp Tại Hub
              </span>
              {user?.hubId && (
                <>
                  <span>•</span>
                  <span className="text-blue-400 font-mono text-[11px]">
                    Hub ID: {user.hubId}
                  </span>
                </>
              )}
            </div>

            {/* User info + Logout */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    <span className="hidden sm:inline">{user.role} ({user.fullName})</span>
                    <span className="sm:hidden">{user.role}</span>
                  </span>
                  <button
                    onClick={logout}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Đăng Xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-80 max-w-[85vw] bg-slate-950 h-full shadow-2xl p-4 overflow-y-auto z-10 flex flex-col justify-between border-r border-slate-800">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain" />
                    <span className="font-bold text-xs text-blue-400">Giao hàng siêu tốc KHO</span>
                  </div>
                  <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {user?.hubId && (
                  <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-semibold">
                    📦 Hub: {user.hubId}
                  </div>
                )}

                <nav className="space-y-1">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition group ${
                          isActive
                            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                            : 'text-slate-400 hover:text-white hover:bg-blue-600 font-medium'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="w-full px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" /> Đăng Xuất
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default WarehouseLayout;
