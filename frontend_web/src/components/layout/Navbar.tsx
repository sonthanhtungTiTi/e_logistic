import React, { useState, useRef, useEffect } from 'react';
import {
  UserCheck,
  Package,
  KeyRound,
  User,
  Settings,
  ShieldCheck,
  CreditCard,
  LogOut,
  ChevronDown,
  PlusCircle,
  Menu,
  X,
  FileSpreadsheet,
  ListFilter,
  Boxes,
  LayoutDashboard,
  Ticket,
  Search,
  Calculator,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { ThemeToggleButton } from '../common/ThemeToggleButton';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const displayName = user?.companyName || user?.fullName || 'Công Ty Dược An Bình';
  const roleDisplay = user?.role || 'SELLER';
  const initialLetter = displayName.trim().charAt(0).toUpperCase() || 'U';

  const isLinkActive = (path: string) => {
    if (path === '/seller/tickets') {
      return location.pathname.startsWith('/seller/tickets');
    }
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200 dark:border-slate-800/80 transition-all backdrop-blur-xl">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">

        {/* Brand Logo & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
              title="Mở menu di động"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}

          <Link to="/" className="flex items-center gap-3 cursor-pointer group">
            <div className="h-10 sm:h-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <img src="/logo.png" alt="Giao hàng siêu tốc Logo" className="h-10 sm:h-12 w-auto object-contain drop-shadow-md" />
            </div>
            <div>
              <span className="font-black text-lg sm:text-2xl tracking-tight text-blue-600 dark:text-blue-400 group-hover:text-blue-500 transition-colors block leading-tight">
                Giao hàng siêu tốc
              </span>
              <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-none mt-0.5">
                giao hàng tận tay bạn
              </p>
            </div>
          </Link>
        </div>

        {/* Right User Actions / Profile */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <ThemeToggleButton />
          {user ? (
            <div className="relative" ref={dropdownRef}>
              {/* User Profile Badge & Avatar Button */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 pl-2 pr-2 rounded-2xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800/90 border border-blue-500/30 text-left transition-all duration-200 group cursor-pointer"
                title="Nhấn để xem thông tin cá nhân & cài đặt"
              >
                {/* Avatar with Glow */}
                <div className="relative shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/40"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm ring-2 ring-blue-400/40 group-hover:scale-105 transition-transform">
                      {initialLetter}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                </div>

                {/* User Name Badge Text */}
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition max-w-[180px] md:max-w-[210px]">
                  <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping shrink-0"></span>
                  <span className="truncate">{displayName} ({roleDisplay})</span>
                </span>

                <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Quick Menu Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 glass-panel border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200 bg-white dark:bg-slate-900">
                  {/* Card Header */}
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-slate-800/80 border border-blue-500/20 space-y-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-base shadow-md">
                        {initialLetter}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          {displayName}
                          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60 text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400">Vai trò:</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold uppercase">
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
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer font-bold shadow-sm shadow-blue-600/20"
                    >
                      <PlusCircle className="w-4 h-4 text-white" />
                      <span>Tạo Đơn Vận Chuyển Mới</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/seller/profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-medium"
                    >
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Hồ Sơ Cá Nhân & Cài Đặt</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/seller/dashboard');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-medium"
                    >
                      <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Kênh Quản Lý Đơn Hàng</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/seller/wallet');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-medium"
                    >
                      <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Ví COD & Doanh Thu</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/seller/profile', { state: { tab: 'SECURITY' } });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-medium"
                    >
                      <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Đổi Mật Khẩu & Bảo Mật</span>
                    </button>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition text-xs font-semibold cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition"
              >
                <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Đăng Nhập
              </Link>
              <Link
                to="/auth/register"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 flex items-center gap-1.5 transition"
              >
                <UserCheck className="w-4 h-4" />
                Đăng Ký Seller
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu (< lg viewports) */}
      {mobileMenuOpen && user && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl p-5 overflow-y-auto flex flex-col justify-between z-10 border-r border-slate-200 dark:border-slate-800">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                    {initialLetter}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                      {displayName}
                    </h2>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                      {roleDisplay}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Actions */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Thao Tác Đơn Hàng
                </div>
                <Link
                  to="/seller/orders/create"
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition ${
                    isLinkActive('/seller/orders/create')
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tạo Đơn Vận Chuyển Mới</span>
                </Link>

                <Link
                  to="/seller/orders/batch"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition ${
                    isLinkActive('/seller/orders/batch')
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Đăng Đơn Excel Loạt</span>
                </Link>

                <Link
                  to="/seller/orders"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition ${
                    isLinkActive('/seller/orders')
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <ListFilter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Quản Lý Danh Sách Đơn</span>
                </Link>

                <Link
                  to="/seller/products"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition ${
                    isLinkActive('/seller/products')
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Sản Phẩm Mẫu (Catalog)</span>
                </Link>
              </div>

              {/* Finance & Management */}
              <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Tài Chính & Hệ Thống
                </div>
                <Link
                  to="/seller/dashboard"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition ${
                    isLinkActive('/seller/dashboard')
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Dashboard Kênh Seller</span>
                </Link>

                <Link
                  to="/seller/wallet"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition ${
                    isLinkActive('/seller/wallet')
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Ví COD & Doanh Thu</span>
                </Link>

                <Link
                  to="/seller/tickets"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition ${
                    isLinkActive('/seller/tickets')
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <Ticket className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Khiếu Nại & Hỗ Trợ Ticket</span>
                </Link>

                <Link
                  to="/seller/profile"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition ${
                    isLinkActive('/seller/profile')
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Hồ Sơ Cá Nhân & Cài Đặt</span>
                </Link>
              </div>

              {/* General Pages */}
              <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Tiện Ích Khác
                </div>
                <Link
                  to="/"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium ${
                    isLinkActive('/') ? 'text-blue-600 font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Search className="w-4 h-4 text-slate-400" />
                  <span>Tra Cứu & Trang Chủ</span>
                </Link>

                <Link
                  to="/pricing"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium ${
                    isLinkActive('/pricing') ? 'text-blue-600 font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Calculator className="w-4 h-4 text-slate-400" />
                  <span>Bảng Giá & Tính Cước</span>
                </Link>
              </div>
            </div>

            {/* Logout Footer */}
            <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/20 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng Xuất Hệ Thống</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
