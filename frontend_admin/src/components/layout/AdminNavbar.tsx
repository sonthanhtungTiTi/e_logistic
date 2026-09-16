import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Cpu, LogOut, Bell, Menu, X, LayoutDashboard, Package, Building2, Compass, Truck, ShieldCheck, DollarSign, Ticket, BarChart3, Users, ShieldAlert } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { usePendingKycCount } from '../../hooks/usePendingKycCount';
import { UserRole } from '@/types/auth.types';
import { ThemeToggleButton } from '../common/ThemeToggleButton';

export const AdminNavbar: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const { pendingCount } = usePendingKycCount();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userRole = (user?.role || '').toString();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/admin/dashboard', label: 'Tổng Quan Operations', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.OPERATIONS, UserRole.DISPATCHER, UserRole.HUB_COORDINATOR] },
    { to: '/admin/orders', label: 'Tất Cả Đơn Hàng (Global List)', icon: Package, roles: [UserRole.ADMIN, UserRole.OPERATIONS, UserRole.DISPATCHER, UserRole.ACCOUNTANT, UserRole.CS, UserRole.CUSTOMER_SERVICE] },
    { to: '/admin/vendor-ops', label: 'Duyệt Đơn & NCC (QL 1)', icon: Building2, roles: [UserRole.ADMIN, UserRole.ORDER_VENDOR_MANAGER, UserRole.OPERATIONS, UserRole.DISPATCHER] },
    { to: '/admin/dispatch/local', label: 'Điều Phối Shipper (QL 2)', icon: Compass, roles: [UserRole.ADMIN, UserRole.LAST_MILE_DISPATCHER, UserRole.DISPATCHER, UserRole.OPERATIONS] },
    { to: '/admin/dispatch/linehaul', label: 'Điều Phối Xe Tải (QL 3)', icon: Truck, roles: [UserRole.ADMIN, UserRole.LINE_HAUL_DISPATCHER, UserRole.DISPATCHER, UserRole.OPERATIONS] },
    { to: '/admin/kyc', label: 'Xác Minh Danh Tính (KYC)', icon: ShieldCheck, roles: [UserRole.ADMIN, UserRole.CS, 'ADMIN', 'CS'] },
    { to: '/admin/pricing', label: 'Bảng Giá & Voucher (CMS)', icon: DollarSign, roles: [UserRole.ADMIN, UserRole.OPERATIONS, UserRole.ACCOUNTANT, 'ADMIN'] },
    { to: '/admin/tickets', label: 'Khiếu Nại & CSKH (Ticket)', icon: Ticket, roles: [UserRole.ADMIN, UserRole.CS, UserRole.CUSTOMER_SERVICE, UserRole.OPERATIONS, 'ADMIN', 'CS'] },
    { to: '/admin/reports', label: 'Báo Cáo Tỷ Lệ SLA & Vận Hành', icon: BarChart3, roles: [UserRole.ADMIN, UserRole.OPERATIONS] },
    { to: '/admin/users', label: 'Quản Lý Người Dùng & Khóa', icon: Users, roles: [UserRole.ADMIN] },
    { to: '/admin/security', label: 'Bảo Mật & Audit Log 2-Lớp', icon: ShieldAlert, roles: [UserRole.ADMIN] },
  ];

  const visibleNavItems = navItems.filter(item => (item.roles as string[]).includes(userRole));

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200 dark:border-slate-800/80 transition-all backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Mobile Toggle & Brand Title */}
        <div className="flex items-center gap-2.5 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Mở menu quản trị"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <img src="/logo.png" alt="Giao hàng siêu tốc Logo" className="h-7 w-auto object-contain" />
          <span className="font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400">Giao hàng siêu tốc ADMIN</span>
        </div>

        {/* System Breadcrumb / Title */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Trung Tâm Điều Hành & Vận Hành Logistics
          </span>
          <span>•</span>
          <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">Hệ Thống Trực Tuyến #VN-SGN-01</span>
        </div>

        {/* User Info, Theme Switcher & Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <ThemeToggleButton showLabel className="hidden sm:flex" />
          <ThemeToggleButton className="sm:hidden" />

          {/* KYC Pending Notification Bell */}
          {user && ['ADMIN', 'CS'].includes(user.role) && (
            <Link
              to="/admin/kyc"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-900/60 transition cursor-pointer"
              title={pendingCount > 0 ? `${pendingCount} hồ sơ KYC đang chờ thẩm định` : 'Không có hồ sơ KYC cần duyệt'}
            >
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </Link>
          )}
          {user && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping"></span>
                <span className="hidden sm:inline">{user.role} ({user.fullName})</span>
                <span className="sm:hidden">{user.role}</span>
              </span>
              <button
                onClick={logout}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-500/15 text-slate-700 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng Xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-950 h-full shadow-2xl p-4 overflow-y-auto z-10 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain" />
                  <span className="font-bold text-xs text-blue-600 dark:text-blue-400">Giao hàng siêu tốc ADMIN</span>
                </div>
                <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {visibleNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition group ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                          : 'text-slate-700 dark:text-slate-300 hover:text-white dark:hover:text-white hover:bg-blue-600 dark:hover:bg-blue-600 font-medium'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" /> Đăng Xuất Hệ Thống
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
