import React from 'react';
import { Outlet, NavLink } from 'react-router';
import { Truck, MapPin, PackageCheck, Wallet, LogOut, User } from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';

export const ShipperLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();

  const isPickupOnly = user?.role === 'PICKUP_SHIPPER';
  const isDeliveryOnly = user?.role === 'DELIVERY_SHIPPER';

  const roleTitle = isPickupOnly
    ? 'Shipper Gom Hàng (First-Mile)'
    : isDeliveryOnly
    ? 'Shipper Giao Hàng (Last-Mile)'
    : 'Shipper Giao Nhận';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* TopBar Compact */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md ${
            isPickupOnly
              ? 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/20'
              : isDeliveryOnly
              ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/20'
              : 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/20'
          }`}>
            {isPickupOnly ? 'G' : isDeliveryOnly ? 'D' : 'S'}
          </div>
          <div>
            <h1 className="text-xs font-black text-white tracking-wide">{roleTitle}</h1>
            <span className="text-[10px] text-cyan-400 font-semibold block">{user?.fullName || 'Shipper Nội Thành'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPickupOnly ? (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Đội Gom
            </span>
          ) : isDeliveryOnly ? (
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold border border-cyan-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Đội Giao
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Trực Ca
            </span>
          )}

          <button
            onClick={logout}
            title="Đăng xuất"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto p-3 pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 max-w-md mx-auto px-4 py-2 flex items-center justify-around">
        <NavLink
          to="/shipper/zone"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition ${
              isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <MapPin className="w-4 h-4" />
          <span>Chọn Zone</span>
        </NavLink>

        {!isDeliveryOnly && (
          <NavLink
            to="/shipper/pickup"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-bold transition ${
                isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <Truck className="w-4 h-4" />
            <span>Lấy Hàng</span>
          </NavLink>
        )}

        {!isPickupOnly && (
          <NavLink
            to="/shipper/delivery"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-bold transition ${
                isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <PackageCheck className="w-4 h-4" />
            <span>Giao Hàng</span>
          </NavLink>
        )}

        <NavLink
          to="/shipper/wallet"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition ${
              isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <Wallet className="w-4 h-4" />
          <span>Ví COD</span>
        </NavLink>

        <NavLink
          to="/shipper/profile"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition ${
              isActive ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <User className="w-4 h-4" />
          <span>Hồ Sơ</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default ShipperLayout;
