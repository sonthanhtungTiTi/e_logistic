import React from 'react';
import { Outlet } from 'react-router';
import { WarehouseSidebar } from '../components/layout/WarehouseSidebar';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { LogOut, Cpu } from 'lucide-react';

export const WarehouseLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-row selection:bg-emerald-500 selection:text-white">
      <WarehouseSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Mobile brand */}
            <div className="flex items-center gap-2 md:hidden">
              <img src="/logo.png" alt="GIAO HÀNG Logo" className="h-7 w-auto object-contain" />
              <span className="font-bold text-sm text-white">GIAO HÀNG KHO</span>
            </div>

            {/* Desktop breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400" /> Hệ Thống Kho Vận & Tác Nghiệp Tại Hub
              </span>
              {user?.hubId && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-mono text-[11px]">
                    Hub ID: {user.hubId}
                  </span>
                </>
              )}
            </div>

            {/* User info + Logout */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {user.role} ({user.fullName})
                  </span>
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Đăng Xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>

        <footer className="w-full glass-panel border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
          <p>© 2026 GIAO HÀNG Warehouse Operations. Bộ phận Kho Vận & Tác Nghiệp Hub.</p>
        </footer>
      </div>
    </div>
  );
};

export default WarehouseLayout;
