import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { FileSpreadsheet, ListFilter, Plus } from 'lucide-react';

export interface OrderSubNavProps {
  activeTab?: 'single' | 'batch' | 'list';
  layout?: 'horizontal' | 'vertical';
}

export const OrderSubNav: React.FC<OrderSubNavProps> = ({ activeTab, layout = 'vertical' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab =
    activeTab ||
    (location.pathname.includes('/batch')
      ? 'batch'
      : location.pathname === '/seller/orders/create'
        ? 'single'
        : 'list');

  const isVertical = layout === 'vertical';

  return (
    <div
      className={`flex ${isVertical ? 'flex-col items-stretch w-full' : 'flex-row items-center'
        } gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-xl`}
    >
      <button
        type="button"
        onClick={() => navigate('/seller/orders/create')}
        className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center ${isVertical ? 'justify-start' : 'justify-center'
          } gap-2.5 transition cursor-pointer ${currentTab === 'single'
            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30'
            : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
          }`}
      >
        <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Tạo Đơn Lẻ</span>
      </button>


    </div>
  );
};
