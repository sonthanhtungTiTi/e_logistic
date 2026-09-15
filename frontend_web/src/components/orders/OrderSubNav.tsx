import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Plus, FileSpreadsheet, ListFilter } from 'lucide-react';

export interface OrderSubNavProps {
  activeTab?: 'single' | 'batch' | 'list';
  layout?: 'horizontal' | 'vertical';
}

export const OrderSubNav: React.FC<OrderSubNavProps> = ({ activeTab, layout = 'horizontal' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab =
    activeTab ||
    (location.pathname === '/seller/orders/batch'
      ? 'batch'
      : location.pathname === '/seller/orders/create'
        ? 'single'
        : 'list');

  const isVertical = layout === 'vertical';

  return (
    <div
      className={`flex ${
        isVertical
          ? 'flex-col items-stretch w-full'
          : 'flex-row items-center flex-wrap sm:flex-nowrap w-full sm:w-auto'
      } gap-1.5 sm:gap-2 bg-slate-100 dark:bg-slate-900/90 p-1.5 sm:p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto`}
    >
      <button
        type="button"
        onClick={() => navigate('/seller/orders/create')}
        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center ${
          isVertical ? 'justify-start' : 'justify-center'
        } gap-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
          currentTab === 'single'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 font-medium'
        }`}
      >
        <Plus className={`w-4 h-4 shrink-0 ${currentTab === 'single' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
        <span>Tạo Đơn Lẻ</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/seller/orders/batch')}
        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center ${
          isVertical ? 'justify-start' : 'justify-center'
        } gap-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
          currentTab === 'batch'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 font-medium'
        }`}
      >
        <FileSpreadsheet className={`w-4 h-4 shrink-0 ${currentTab === 'batch' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
        <span>Đăng Đơn Excel Loạt</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/seller/orders')}
        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center ${
          isVertical ? 'justify-start' : 'justify-center'
        } gap-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
          currentTab === 'list'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 font-medium'
        }`}
      >
        <ListFilter className={`w-4 h-4 shrink-0 ${currentTab === 'list' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
        <span>Danh Sách Đơn Hàng</span>
      </button>
    </div>
  );
};

export default OrderSubNav;
