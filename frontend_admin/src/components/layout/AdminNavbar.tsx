import React from 'react';
import { Link } from 'react-router';
import { Cpu, LogOut, Bell } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { usePendingKycCount } from '../../hooks/usePendingKycCount';
import { ThemeToggleButton } from '../common/ThemeToggleButton';

export const AdminNavbar: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const { pendingCount } = usePendingKycCount();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Mobile Brand Title */}
        <div className="flex items-center gap-2 md:hidden">
          <img src="/logo.png" alt="GIAO HÀNG Logo" className="h-7 w-auto object-contain" />
          <span className="font-bold text-sm text-slate-900 dark:text-white">GIAO HÀNG ADMIN</span>
        </div>

        {/* System Breadcrumb / Title */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Trung Tâm Điều Hành & Vận Hành Logistics
          </span>
          <span>•</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-mono text-[11px]">Hệ Thống Trực Tuyến #VN-SGN-01</span>
        </div>

        {/* User Info, Theme Switcher & Logout */}
        <div className="flex items-center gap-2.5">
          <ThemeToggleButton showLabel className="hidden sm:flex" />
          <ThemeToggleButton className="sm:hidden" />

          {/* KYC Pending Notification Bell */}
          {user && ['ADMIN', 'CS'].includes(user.role) && (
            <Link
              to="/admin/kyc"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-900/60 transition cursor-pointer"
              title={pendingCount > 0 ? `${pendingCount} hồ sơ KYC đang chờ thẩm định` : 'Không có hồ sơ KYC cần duyệt'}
            >
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="absolute 1 top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </Link>
          )}
          {user && (
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping"></span>
                {user.role} ({user.fullName})
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-500/15 text-slate-700 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng Xuất
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
