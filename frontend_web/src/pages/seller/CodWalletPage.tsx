import React from 'react';
import { useNavigate } from 'react-router';
import { Wallet, ArrowDownRight, PlusCircle, ChevronRight } from 'lucide-react';

export const CodWalletPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4 sm:pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span
              className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
              onClick={() => navigate('/seller/dashboard')}
            >
              Seller Dashboard
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ví COD &amp; Doanh Thu</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" /> Ví Thu Hộ COD &amp; Công Nợ
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi số tiền COD tài xế đã thu và yêu cầu rút tiền về tài khoản ngân hàng
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/seller/orders/create')}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto transition"
        >
          <PlusCircle className="w-4 h-4" /> Tạo Đơn Hàng Mới
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Số Dư COD Có Thể Rút</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">12.850.000 ₫</div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Đang Đối Soát Chờ Chuyển</span>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400">3.400.000 ₫</div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Tổng Đã Rút Lũy Kế</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">145.200.000 ₫</div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition">
          <ArrowDownRight className="w-4 h-4" /> Yêu Cầu Rút Tiền Về Ngân Hàng
        </button>
      </div>
    </div>
  );
};
