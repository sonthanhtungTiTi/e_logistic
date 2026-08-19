import React from 'react';
import {
  Search,
  Calculator,
  PlusCircle,
  FileSpreadsheet,
  ListFilter,
  CreditCard,
  Ticket,
  User,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Chỉ hiển thị Sidebar khi người dùng đã ĐĂNG NHẬP và không nằm ở các trang Auth
  const isAuthRoute = location.pathname.startsWith('/auth');
  if (!user || isAuthRoute) {
    return null;
  }

  const displayName = user?.companyName || user?.fullName || 'Công Ty Dược An Bình';
  const roleDisplay = user?.role || 'SELLER';
  const initialLetter = displayName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-slate-800/80 bg-[#090d16] h-[calc(100vh-5rem)] sticky top-20 z-30 p-4 space-y-5 overflow-y-auto text-xs select-none">
      
      {/* User Info Card */}
      {user ? (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-400/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-inner ring-2 ring-emerald-400/40">
                  {initialLetter}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
            </div>

            <div className="overflow-hidden min-w-0">
              <div className="font-bold text-sm text-white truncate flex items-center gap-1">
                <span className="truncate">{displayName}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <div className="text-[11px] text-slate-400 truncate">{user.email || 'seller@elogistic.vn'}</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
            <span className="text-slate-400">Tài khoản:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-extrabold border border-emerald-500/30 uppercase tracking-wider">
              {roleDisplay}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
          <p className="font-bold text-slate-300">Chào mừng đến với E-Logistic</p>
          <p className="text-[11px] text-slate-400">Đăng nhập để trải nghiệm đầy đủ tính năng tạo đơn & quản lý bưu gửi.</p>
          <Link
            to="/auth/login"
            className="block w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
          >
            Đăng Nhập Ngay
          </Link>
        </div>
      )}

      {/* Main Order Actions Section */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
          <span>Thao Tác Đơn Hàng</span>
          <Sparkles className="w-3 h-3 text-cyan-400" />
        </div>

        <Link
          to="/seller/orders/create"
          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold transition shadow-lg ${
            location.pathname === '/seller/orders/create'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-600/30 ring-1 ring-cyan-400/40'
              : 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/30'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">Tạo Đơn Vận Chuyển Mới</span>
        </Link>

        <Link
          to="/seller/orders/batch"
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold transition ${
            location.pathname === '/seller/orders/batch'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20 ring-1 ring-cyan-400/40'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">Đăng Đơn Excel Loạt</span>
        </Link>

        <Link
          to="/seller/orders"
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-semibold transition ${
            location.pathname === '/seller/orders'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <ListFilter className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="truncate">Quản Lý Danh Sách Đơn</span>
        </Link>
      </div>

      {/* Finance & Management Section */}
      <div className="space-y-1 pt-2 border-t border-slate-800/80">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
          Tài Chính & Hệ Thống
        </div>

        <Link
          to="/seller/dashboard"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition ${
            location.pathname === '/seller/dashboard'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Dashboard Kênh Seller</span>
        </Link>

        <Link
          to="/seller/wallet"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition ${
            location.pathname === '/seller/wallet'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Ví COD & Doanh Thu</span>
        </Link>

        <Link
          to="/seller/tickets"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition ${
            location.pathname.startsWith('/seller/tickets')
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <Ticket className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Khiếu Nại & Hỗ Trợ Ticket</span>
        </Link>

        <Link
          to="/seller/profile"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition ${
            location.pathname === '/seller/profile'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <User className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Hồ Sơ Cá Nhân & Cài Đặt</span>
        </Link>
      </div>

      {/* Main Pages Section */}
      <div className="space-y-1 pt-2 border-t border-slate-800/80">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
          Tiện Ích Khác
        </div>

        <Link
          to="/"
          className={`flex items-center justify-between px-3.5 py-2 rounded-xl transition ${
            location.pathname === '/' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Tra Cứu & Trang Chủ</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        </Link>

        <Link
          to="/pricing"
          className={`flex items-center justify-between px-3.5 py-2 rounded-xl transition ${
            location.pathname === '/pricing' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Calculator className="w-3.5 h-3.5 text-slate-500" />
            <span>Bảng Giá & Tính Cước</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        </Link>
      </div>

      {/* Logout Footer */}
      {user && (
        <div className="pt-4 mt-auto border-t border-slate-800">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition font-bold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng Xuất Hệ Thống</span>
          </button>
        </div>
      )}

    </aside>
  );
};
