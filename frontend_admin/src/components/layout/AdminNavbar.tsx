import React from 'react';
import { Cpu, LogOut } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

export const AdminNavbar: React.FC = () => {
  const { user, logout } = useAdminAuth();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Mobile Brand Title */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-xs">
            E
          </div>
          <span className="font-bold text-sm text-white">ADMIN OPERATIONS</span>
        </div>

        {/* System Breadcrumb / Title */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" /> Trung Tâm Điều Hành & Vận Hành Logistics
          </span>
          <span>•</span>
          <span className="text-cyan-400 font-mono text-[11px]">Realtime System Node #VN-SGN-01</span>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {user.role} ({user.fullName})
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
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
