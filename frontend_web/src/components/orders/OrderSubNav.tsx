import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Package, FileSpreadsheet, ListFilter } from 'lucide-react';

export interface OrderSubNavProps {
  activeTab?: 'single' | 'batch' | 'list';
}

export const OrderSubNav: React.FC<OrderSubNavProps> = ({ activeTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab =
    activeTab ||
    (location.pathname.includes('/batch')
      ? 'batch'
      : location.pathname === '/seller/orders/create'
      ? 'single'
      : 'list');

  return (
    <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto shadow-xl">
      <button
        type="button"
        onClick={() => navigate('/seller/orders/create')}
        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
          currentTab === 'single'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
        }`}
      >
        <Package className="w-4 h-4 text-blue-400" />
        <span>Đăng Đơn Lẻ</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/seller/orders/batch')}
        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
          currentTab === 'batch'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
        }`}
      >
        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
        <span>Đăng Đơn Excel</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/seller/orders')}
        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
          currentTab === 'list'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
        }`}
      >
        <ListFilter className="w-4 h-4 text-purple-400" />
        <span>Quản Lý Đơn</span>
      </button>
    </div>
  );
};
