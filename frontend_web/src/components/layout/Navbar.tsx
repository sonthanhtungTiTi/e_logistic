import React, { useState, useRef, useEffect } from 'react';
import {
  Truck,
  UserCheck,
  Package,
  Cpu,
  KeyRound,
  User,
  Settings,
  ShieldCheck,
  CreditCard,
  LogOut,
  ChevronDown,
  PlusCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.companyName || user?.fullName || 'Công Ty Dược An Bình';
  const roleDisplay = user?.role || 'SELLER';
  const initialLetter = displayName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 transition-all backdrop-blur-xl bg-[#090d16]/80">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">
                E-LOGISTIC
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> AI Freight
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Smart Supply Chain & Courier Platform</p>
          </div>
        </Link>

        {/* Right User Actions / Profile */}
        <div className="flex items-center gap-3 ml-auto">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              {/* User Profile Badge & Avatar Button */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 pl-2.5 pr-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-emerald-500/30 text-left transition-all duration-200 shadow-md group cursor-pointer"
                title="Nhấn để xem thông tin cá nhân & cài đặt"
              >
                {/* Avatar with Glow */}
                <div className="relative shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      className="w-8 h-8 rounded-xl object-cover ring-2 ring-emerald-400/40"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-inner ring-2 ring-emerald-400/40 group-hover:scale-105 transition-transform">
                      {initialLetter}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
                </div>

                {/* User Name Badge Text */}
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition max-w-[180px] md:max-w-[210px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                  <span className="truncate">{displayName} ({roleDisplay})</span>
                </span>

                <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Quick Menu Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#0d1322] border border-slate-700/80 rounded-3xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Card Header */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/20 space-y-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-extrabold text-base shadow-md">
                        {initialLetter}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                          {displayName}
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                      <span className="text-slate-400">Vai trò:</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 uppercase">
                        {roleDisplay}
                      </span>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/seller/orders/create');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-500/30 text-white hover:from-blue-800/50 hover:to-cyan-800/50 transition cursor-pointer font-bold"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-400" />
                      <span>Tạo Đơn Vận Chuyển Mới</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/seller/profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer font-medium"
                    >
                      <User className="w-4 h-4 text-blue-400" />
                      <span>Hồ Sơ Cá Nhân & Cài Đặt</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/seller/dashboard');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer font-medium"
                    >
                      <Package className="w-4 h-4 text-cyan-400" />
                      <span>Kênh Quản Lý Đơn Hàng</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/seller/wallet');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer font-medium"
                    >
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      <span>Ví COD & Doanh Thu</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/seller/profile', { state: { tab: 'SECURITY' } });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800/80 transition cursor-pointer font-medium"
                    >
                      <Settings className="w-4 h-4 text-purple-400" />
                      <span>Đổi Mật Khẩu & Bảo Mật</span>
                    </button>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition text-xs font-semibold cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng Xuất Hệ Thống</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth/login"
                className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-slate-700 flex items-center gap-1.5 transition"
              >
                <KeyRound className="w-4 h-4 text-blue-400" />
                Đăng Nhập
              </Link>
              <Link
                to="/auth/register"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 flex items-center gap-1.5 transition"
              >
                <UserCheck className="w-4 h-4" />
                Đăng Ký Seller
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
