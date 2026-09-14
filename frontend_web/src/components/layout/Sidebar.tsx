import React, { useState } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
  Boxes,
} from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('seller_sidebar_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('seller_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Chỉ hiển thị Sidebar khi người dùng đã ĐĂNG NHẬP và không nằm ở các trang Auth
  const isAuthRoute = location.pathname.startsWith('/auth');
  if (!user || isAuthRoute) {
    return null;
  }

  const isLinkActive = (path: string) => {
    if (path === '/seller/tickets') {
      return location.pathname.startsWith('/seller/tickets');
    }
    return location.pathname === path;
  };

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800/80 glass-panel h-[calc(100vh-5rem)] sticky top-20 z-30 overflow-y-auto text-xs select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20 p-2.5 space-y-3' : 'w-64 xl:w-72 p-4 space-y-4'
      }`}
    >
      {/* Header Toggle Button */}
      <div
        className={`flex items-center pb-2 border-b border-slate-200 dark:border-slate-800/80 ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {!isCollapsed && (
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Menu Kênh Bán
          </span>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Order Actions Section */}
      <div className={`space-y-1.5 ${isCollapsed ? 'w-full' : ''}`}>
        {!isCollapsed ? (
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
            <span>Thao Tác Đơn Hàng</span>
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          </div>
        ) : (
          <div className="w-full flex justify-center py-0.5" title="Thao Tác Đơn Hàng">
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          </div>
        )}

        <Link
          to="/seller/orders/create"
          title="Tạo Đơn Vận Chuyển Mới"
          className={`w-full flex items-center rounded-2xl font-bold transition ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-3'
          } ${
            isLinkActive('/seller/orders/create')
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10'
          }`}
        >
          <PlusCircle className={`w-4 h-4 shrink-0 ${isLinkActive('/seller/orders/create') ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
          {!isCollapsed && <span className="truncate">Tạo Đơn Vận Chuyển Mới</span>}
        </Link>

        <Link
          to="/seller/orders/batch"
          title="Đăng Đơn Excel Loạt"
          className={`w-full flex items-center rounded-2xl font-bold transition ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
          } ${
            isLinkActive('/seller/orders/batch')
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isLinkActive('/seller/orders/batch') ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
          {!isCollapsed && <span className="truncate">Đăng Đơn Excel Loạt</span>}
        </Link>

        <Link
          to="/seller/orders"
          title="Quản Lý Danh Sách Đơn"
          className={`w-full flex items-center rounded-2xl transition ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
          } ${
            isLinkActive('/seller/orders')
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <ListFilter className={`w-4 h-4 shrink-0 ${isLinkActive('/seller/orders') ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
          {!isCollapsed && <span className="truncate">Quản Lý Danh Sách Đơn</span>}
        </Link>

        <Link
          to="/seller/products"
          title="Danh Mục Sản Phẩm Mẫu"
          className={`w-full flex items-center rounded-2xl transition ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
          } ${
            isLinkActive('/seller/products')
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <Boxes className={`w-4 h-4 shrink-0 ${isLinkActive('/seller/products') ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
          {!isCollapsed && <span className="truncate">Sản Phẩm Mẫu (Catalog)</span>}
        </Link>
      </div>

      {/* Finance & Management Section */}
      <div className={`space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800/80 ${isCollapsed ? 'w-full' : ''}`}>
        {!isCollapsed && (
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
            Tài Chính & Hệ Thống
          </div>
        )}

        <Link
          to="/seller/dashboard"
          title="Dashboard Kênh Seller"
          className={`w-full flex items-center rounded-xl transition ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
          } ${
            isLinkActive('/seller/dashboard')
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 shrink-0 ${isLinkActive('/seller/dashboard') ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
          {!isCollapsed && <span>Dashboard Kênh Seller</span>}
        </Link>

        <Link
          to="/seller/wallet"
          title="Ví COD & Doanh Thu"
          className={`w-full flex items-center rounded-xl transition ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
          } ${
            isLinkActive('/seller/wallet')
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <CreditCard className={`w-4 h-4 shrink-0 ${isLinkActive('/seller/wallet') ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
          {!isCollapsed && <span>Ví COD & Doanh Thu</span>}
        </Link>

        <Link
          to="/seller/tickets"
          title="Khiếu Nại & Hỗ Trợ Ticket"
          className={`w-full flex items-center rounded-xl transition ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
          } ${
            isLinkActive('/seller/tickets')
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <Ticket className={`w-4 h-4 shrink-0 ${isLinkActive('/seller/tickets') ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
          {!isCollapsed && <span>Khiếu Nại & Hỗ Trợ Ticket</span>}
        </Link>

        <Link
          to="/seller/profile"
          title="Hồ Sơ Cá Nhân & Cài Đặt"
          className={`w-full flex items-center rounded-xl transition ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
          } ${
            isLinkActive('/seller/profile')
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <User className={`w-4 h-4 shrink-0 ${isLinkActive('/seller/profile') ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
          {!isCollapsed && <span>Hồ Sơ Cá Nhân & Cài Đặt</span>}
        </Link>
      </div>

      {/* Main Pages Section */}
      <div className={`space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800/80 ${isCollapsed ? 'w-full' : ''}`}>
        {!isCollapsed && (
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
            Tiện Ích Khác
          </div>
        )}

        <Link
          to="/"
          title="Tra Cứu & Trang Chủ"
          className={`w-full flex items-center rounded-xl transition ${
            isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
          } ${
            isLinkActive('/')
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
            <Search className={`w-4 h-4 shrink-0 ${isLinkActive('/') ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
            {!isCollapsed && <span>Tra Cứu & Trang Chủ</span>}
          </div>
          {!isCollapsed && <ChevronRight className={`w-3.5 h-3.5 ${isLinkActive('/') ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />}
        </Link>

        <Link
          to="/pricing"
          title="Bảng Giá & Tính Cước"
          className={`w-full flex items-center rounded-xl transition ${
            isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
          } ${
            isLinkActive('/pricing')
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
            <Calculator className={`w-4 h-4 shrink-0 ${isLinkActive('/pricing') ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
            {!isCollapsed && <span>Bảng Giá & Tính Cước</span>}
          </div>
          {!isCollapsed && <ChevronRight className={`w-3.5 h-3.5 ${isLinkActive('/pricing') ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />}
        </Link>
      </div>

      {/* Logout Footer */}
      {user && (
        <div className={`pt-3 mt-auto border-t border-slate-200 dark:border-slate-800 ${isCollapsed ? 'w-full' : ''}`}>
          <button
            type="button"
            onClick={logout}
            title="Đăng Xuất Hệ Thống"
            className={`w-full flex items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition cursor-pointer ${
              isCollapsed ? 'p-2.5' : 'gap-2 px-3 py-2.5 font-bold'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Đăng Xuất Hệ Thống</span>}
          </button>
        </div>
      )}
    </aside>
  );
};
