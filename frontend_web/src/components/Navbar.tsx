import { Truck, Calculator, UserCheck, Package, Cpu, Search, KeyRound } from 'lucide-react';
import type { UserRole } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: (mode?: 'login' | 'register' | 'forgot') => void;
  currentUserRole: UserRole | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  currentUserRole,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">
                E-LOGISTIC
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> AI Freight
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Smart Supply Chain & Courier Platform</p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'home'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-4 h-4" />
            Tra Cứu & Trang Chủ
          </button>

          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'calculator'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Tính Cước & Trọng Lượng
          </button>

          <button
            onClick={() => setActiveTab('seller')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'seller'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-4 h-4" />
            Kênh Chủ Hàng / Seller
          </button>

          <button
            onClick={() => setActiveTab('driver')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'driver'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            Ứng Dụng Tài Xế
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {currentUserRole ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Đã đăng nhập ({currentUserRole})
              </span>
              <button
                onClick={onLogout}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                Đăng Xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-slate-700 flex items-center gap-1.5 transition"
              >
                <KeyRound className="w-4 h-4 text-blue-400" />
                Đăng Nhập
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 flex items-center gap-1.5 transition"
              >
                <UserCheck className="w-4 h-4" />
                Đăng Ký Đội Xe
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Mobile Tab bar */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-800 bg-slate-950/80 px-4 py-2 gap-2 text-xs font-medium no-scrollbar">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'home' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Trang Chủ & Tra Cứu
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'calculator' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Tính Cước Phí
        </button>
        <button
          onClick={() => setActiveTab('seller')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'seller' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Seller Portal
        </button>
        <button
          onClick={() => setActiveTab('driver')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'driver' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Tài Xế
        </button>
      </div>
    </header>
  );
};
