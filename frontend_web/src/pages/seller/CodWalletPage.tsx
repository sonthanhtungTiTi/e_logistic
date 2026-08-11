import React from 'react';
import { Wallet, ArrowDownRight } from 'lucide-react';

export const CodWalletPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-2xl font-black text-white flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-400" /> Ví Thu Hộ COD & Công Nợ
        </h3>
        <p className="text-xs text-slate-400">Theo dõi số tiền COD tài xế đã thu và yêu cầu rút tiền về tài khoản ngân hàng</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Số Dư COD Có Thể Rút</span>
          <div className="text-2xl font-black text-emerald-400">12.850.000 ₫</div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Đang Đối Soát Chờ Chuyển</span>
          <div className="text-2xl font-black text-amber-400">3.400.000 ₫</div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Tổng Đã Rút Lũy Kế</span>
          <div className="text-2xl font-black text-purple-300">145.200.000 ₫</div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-2">
          <ArrowDownRight className="w-4 h-4" /> Yêu Cầu Rút Tiền Về Ngân Hàng
        </button>
      </div>
    </div>
  );
};
