import React from 'react';
import { History, CheckCircle2 } from 'lucide-react';

export const PayoutHistoryPage: React.FC = () => {
  const payouts = [
    { id: 'PAY-8821', amount: 5400000, bank: 'MB Bank', account: '9999****123', status: 'COMPLETED', date: '2026-08-08 16:30' },
    { id: 'PAY-7719', amount: 8200000, bank: 'Vietcombank', account: '0071****999', status: 'COMPLETED', date: '2026-08-01 10:15' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-2xl font-black text-white flex items-center gap-2">
          <History className="w-6 h-6 text-purple-400" /> Lịch Sử Chuyển Khoản Payout
        </h3>
        <p className="text-xs text-slate-400">Các giao dịch đối soát tiền COD đã chuyển về tài khoản ngân hàng của bạn</p>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
              <th className="p-3">Mã Giao Dịch</th>
              <th className="p-3">Số Tiền</th>
              <th className="p-3">Ngân Hàng Nhận</th>
              <th className="p-3">Thời Gian</th>
              <th className="p-3">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {payouts.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-purple-400">{p.id}</td>
                <td className="p-3 font-extrabold text-emerald-400">{p.amount.toLocaleString('vi-VN')} ₫</td>
                <td className="p-3 text-slate-300 font-sans">{p.bank} ({p.account})</td>
                <td className="p-3 text-slate-400">{p.date}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
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
