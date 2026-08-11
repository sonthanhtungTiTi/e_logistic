import React from 'react';
import { HelpCircle, Plus } from 'lucide-react';
import { Link } from 'react-router';

export const TicketListPage: React.FC = () => {
  const tickets = [
    { id: 'TCK-1092', trackingNumber: 'VN-LOG-889421', subject: 'Yêu cầu giao lại lần 2 do khách vắng nhà', status: 'IN_PROGRESS', date: '2026-08-09 14:20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-indigo-400" /> Danh Sách Ticket Khiếu Nại & Hỗ Trợ
          </h3>
          <p className="text-xs text-slate-400">Gửi yêu cầu kiểm tra bưu gửi, hoãn giao hoặc xử lý đền bù</p>
        </div>
        <Link to="/seller/tickets/create" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg">
          <Plus className="w-4 h-4" /> Tạo Ticket Mới
        </Link>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
              <th className="p-3">Mã Ticket</th>
              <th className="p-3">Vận Đơn Liên Quan</th>
              <th className="p-3">Tiêu Đề / Nội Dung</th>
              <th className="p-3">Thời Gian</th>
              <th className="p-3">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-slate-800/40">
                <td className="p-3 font-mono font-bold text-indigo-400">{t.id}</td>
                <td className="p-3 font-mono text-blue-400">{t.trackingNumber}</td>
                <td className="p-3 text-white font-semibold">{t.subject}</td>
                <td className="p-3 font-mono text-slate-400">{t.date}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 text-[10px]">Đang Xử Lý</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
