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

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-slate-800/80 glass-panel h-[calc(100vh-5rem)] sticky top-20 z-30 p-4 space-y-5 overflow-y-auto text-xs select-none">
      {/* Main Order Actions Section */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
          <span>Thao Tác Đơn Hàng</span>
          <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
        </div>

        <Link
          to="/seller/orders/create"
          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold transition ${
            location.pathname === '/seller/orders/create'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white ring-1 ring-cyan-400/40'
              : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span className="truncate">Tạo Đơn Vận Chuyển Mới</span>
        </Link>

        <Link
          to="/seller/orders/batch"
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold transition ${
            location.pathname === '/seller/orders/batch'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white ring-1 ring-cyan-400/40'
              : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span className="truncate">Đăng Đơn Excel Loạt</span>
        </Link>

        <Link
          to="/seller/orders"
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-semibold transition ${
            location.pathname === '/seller/orders'
              ? 'bg-blue-600/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-bold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ListFilter className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="truncate">Quản Lý Danh Sách Đơn</span>
        </Link>
      </div>

      {/* Finance & Management Section */}
      <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
          Tài Chính & Hệ Thống
        </div>

        <Link
          to="/seller/dashboard"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition ${
            location.pathname === '/seller/dashboard'
              ? 'bg-blue-600/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-bold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>Dashboard Kênh Seller</span>
        </Link>

        <Link
          to="/seller/wallet"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition ${
            location.pathname === '/seller/wallet'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Ví COD & Doanh Thu</span>
        </Link>

        <Link
          to="/seller/tickets"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition ${
            location.pathname.startsWith('/seller/tickets')
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Ticket className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>Khiếu Nại & Hỗ Trợ Ticket</span>
        </Link>

        <Link
          to="/seller/profile"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition ${
            location.pathname === '/seller/profile'
              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
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
