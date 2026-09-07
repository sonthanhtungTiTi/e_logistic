import React from 'react';
import { Outlet, NavLink } from 'react-router';
import { Truck, ClipboardCheck, Navigation, LogOut } from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';

export const LineHaulLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* TopBar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-orange-500/20">
            T
          </div>
          <div>
            <h1 className="text-xs font-black text-white tracking-wide">Tài Xế Tuyến (Line-Haul)</h1>
            <span className="text-[10px] text-orange-400 font-semibold block">
              {user?.fullName || 'Tài xế xe tải'} • {user?.vehicleInfo?.licensePlate || 'Xe Tải'}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          title="Đăng xuất"
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto p-3 pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 max-w-md mx-auto px-6 py-2 flex items-center justify-around">
        <NavLink
          to="/linehaul/trips"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition ${
              isActive ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <Truck className="w-5 h-5" />
          <span>Chuyến Xe</span>
        </NavLink>

        <NavLink
          to="/linehaul/handoff"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition ${
              isActive ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <ClipboardCheck className="w-5 h-5" />
          <span>Quét Bàn Giao</span>
        </NavLink>

        <NavLink
          to="/linehaul/transit"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition ${
              isActive ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <Navigation className="w-5 h-5" />
          <span>Hành Trình GPS</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default LineHaulLayout;
