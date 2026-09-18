import React from 'react';
import { useNavigate } from 'react-router';
import { History, CheckCircle2, ChevronRight } from 'lucide-react';

export const PayoutHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const payouts = [
    { id: 'PAY-8821', amount: 5400000, bank: 'MB Bank', account: '9999****123', status: 'COMPLETED', date: '2026-08-08 16:30' },
    { id: 'PAY-7719', amount: 8200000, bank: 'Vietcombank', account: '0071****999', status: 'COMPLETED', date: '2026-08-01 10:15' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4 sm:pb-5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span
            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
            onClick={() => navigate('/seller/dashboard')}
          >
            Seller Dashboard
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
          <span className="text-blue-600 dark:text-blue-400 font-semibold">Lịch Sử Đối Soát &amp; Rút Tiền</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <History className="w-7 h-7 text-blue-600 dark:text-blue-400 shrink-0" /> Lịch Sử Chuyển Khoản Payout
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Các giao dịch đối soát tiền COD đã chuyển về tài khoản ngân hàng của bạn
        </p>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px]">
              <th className="p-3.5">Mã Giao Dịch</th>
              <th className="p-3.5">Số Tiền</th>
              <th className="p-3.5">Ngân Hàng Nhận</th>
              <th className="p-3.5">Thời Gian</th>
              <th className="p-3.5">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
            {payouts.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td className="p-3.5 font-bold text-blue-600 dark:text-blue-400">{p.id}</td>
                <td className="p-3.5 font-extrabold text-emerald-600 dark:text-emerald-400">{p.amount.toLocaleString('vi-VN')} ₫</td>
                <td className="p-3.5 text-slate-700 dark:text-slate-300 font-sans">{p.bank} ({p.account})</td>
                <td className="p-3.5 text-slate-500 dark:text-slate-400">{p.date}</td>
                <td className="p-3.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Thành Công
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
