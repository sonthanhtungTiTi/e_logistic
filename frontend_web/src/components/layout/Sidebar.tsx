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
import { NavLink, useLocation } from 'react-router';
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

  const navLinkClass = (isActive: boolean) =>
    `w-full flex items-center rounded-2xl transition group ${
      isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
    } ${
      isActive
        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-blue-600 dark:hover:text-blue-400 font-medium'
    }`;

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 h-[calc(100vh-5rem)] sticky top-20 z-30 overflow-y-auto text-xs select-none transition-all duration-300 ease-in-out ${
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
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
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

        <NavLink
          to="/seller/orders/create"
          end
          title="Tạo Đơn Vận Chuyển Mới"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              <PlusCircle className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-600'}`} />
              {!isCollapsed && <span className="truncate">Tạo Đơn Vận Chuyển Mới</span>}
            </>
          )}
        </NavLink>

        <NavLink
          to="/seller/orders/batch"
          end
          title="Đăng Đơn Excel Loạt"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              <FileSpreadsheet className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-600'}`} />
              {!isCollapsed && <span className="truncate">Đăng Đơn Excel Loạt</span>}
            </>
          )}
        </NavLink>

        <NavLink
          to="/seller/orders"
          end
          title="Quản Lý Danh Sách Đơn"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              <ListFilter className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-600'}`} />
              {!isCollapsed && <span className="truncate">Quản Lý Danh Sách Đơn</span>}
            </>
          )}
        </NavLink>

        <NavLink
          to="/seller/products"
          end
          title="Danh Mục Sản Phẩm Mẫu"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              <Boxes className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-600'}`} />
              {!isCollapsed && <span className="truncate">Sản Phẩm Mẫu (Catalog)</span>}
            </>
          )}
        </NavLink>
      </div>

      {/* Finance & Management Section */}
      <div className={`space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800/80 ${isCollapsed ? 'w-full' : ''}`}>
        {!isCollapsed && (
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
            Tài Chính &amp; Hệ Thống
          </div>
        )}

        <NavLink
          to="/seller/dashboard"
          end
          title="Dashboard Kênh Seller"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-600'}`} />
              {!isCollapsed && <span>Dashboard Kênh Seller</span>}
            </>
          )}
        </NavLink>

        <NavLink
          to="/seller/wallet"
          end
          title="Ví COD & Doanh Thu"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              <CreditCard className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-600'}`} />
              {!isCollapsed && <span>Ví COD &amp; Doanh Thu</span>}
            </>
          )}
        </NavLink>

        <NavLink
          to="/seller/tickets"
          end
          title="Khiếu Nại & Hỗ Trợ Ticket"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              <Ticket className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-600'}`} />
              {!isCollapsed && <span>Khiếu Nại &amp; Hỗ Trợ Ticket</span>}
            </>
          )}
        </NavLink>

        <NavLink
          to="/seller/profile"
          end
          title="Hồ Sơ Cá Nhân & Cài Đặt"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              <User className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-600'}`} />
              {!isCollapsed && <span>Hồ Sơ Cá Nhân &amp; Cài Đặt</span>}
            </>
          )}
        </NavLink>
      </div>

      {/* Main Pages Section */}
      <div className={`space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800/80 ${isCollapsed ? 'w-full' : ''}`}>
        {!isCollapsed && (
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
            Tiện Ích Khác
          </div>
        )}

        <NavLink
          to="/"
          end
          title="Tra Cứu & Trang Chủ"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                <Search className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-600'}`} />
                {!isCollapsed && <span>Tra Cứu &amp; Trang Chủ</span>}
              </div>
              {!isCollapsed && <ChevronRight className={`w-3.5 h-3.5 transition-colors ml-auto ${isActive ? 'text-white' : 'text-slate-400'}`} />}
            </>
          )}
        </NavLink>

        <NavLink
          to="/pricing"
          end
          title="Bảng Giá & Tính Cước"
          className={({ isActive }) => navLinkClass(isActive)}
        >
          {({ isActive }) => (
            <>
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                <Calculator className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-600'}`} />
                {!isCollapsed && <span>Bảng Giá &amp; Tính Cước</span>}
              </div>
              {!isCollapsed && <ChevronRight className={`w-3.5 h-3.5 transition-colors ml-auto ${isActive ? 'text-white' : 'text-slate-400'}`} />}
            </>
          )}
        </NavLink>
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

