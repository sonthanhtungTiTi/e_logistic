import React from 'react';
import { Outlet, NavLink } from 'react-router';
import { Truck, PackageCheck, LogOut } from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';

interface DriverLayoutProps {
  children?: React.ReactNode;
}

export const DriverLayout: React.FC<DriverLayoutProps> = ({ children }) => {
  const { user, logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* TopBar Compact */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-cyan-500/20">
            D
          </div>
          <div>
            <h1 className="text-xs font-black text-white tracking-wide">Driver Mobile PWA</h1>
            <span className="text-[10px] text-cyan-400 font-semibold block">{user?.fullName || 'Tài xế v2.4'}</span>
          </div>
        </div>

        <button
          onClick={logout}
          title="Đăng xuất"
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto">
        {children || <Outlet />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 max-w-md mx-auto px-6 py-2 flex items-center justify-around">
        <NavLink
          to="/driver/pickup"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-bold transition ${
              isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <Truck className="w-5 h-5" />
          <span>Lấy Hàng</span>
        </NavLink>

        <NavLink
          to="/warehouse/inbound"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-bold transition ${
              isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <PackageCheck className="w-5 h-5" />
          <span>Kho Inbound</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default DriverLayout;
