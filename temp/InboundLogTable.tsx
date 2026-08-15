import React from 'react';
import { PackageCheck, AlertOctagon, CheckCircle2, XCircle } from 'lucide-react';

export interface ScanItemLog {
  id: string;
  tracking_code: string;
  status: string;
  next_action: string;
  is_flagged: boolean;
  time: string;
  isSuccess: boolean;
  errorMessage?: string;
}

interface InboundLogTableProps {
  logs: ScanItemLog[];
}

export const InboundLogTable: React.FC<InboundLogTableProps> = ({ logs }) => {
  const getBadgeStyle = (action: string) => {
    switch (action) {
      case 'SORT_FOR_TRANSIT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'WAITING_FOR_DELIVERY':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'SORT_FOR_NEXT_HUB':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'WAITING_SELLER_RETURN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'SORT_FOR_TRANSIT':
        return '📦 Gom bao chờ luân chuyển';
      case 'WAITING_FOR_DELIVERY':
        return '🚚 Đưa vào line Chờ giao';
      case 'SORT_FOR_NEXT_HUB':
        return '🔄 Phân loại trung chuyển tiếp';
      case 'WAITING_SELLER_RETURN':
        return '↩️ Khay chờ trả Seller';
      case 'HOLD':
      case 'EXCEPTION_AREA':
        return '⛔ Giữ lại kiểm tra ngoại lệ';
      default:
        return action;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-cyan-400" />
          Lịch sử quét trong ca làm việc
        </h2>
        <span className="text-xs text-slate-400 font-mono">
          Hiển thị realtime {logs.length} kiện hàng
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Thời gian</th>
              <th className="py-3.5 px-4">Mã vận đơn</th>
              <th className="py-3.5 px-4">Trạng thái mới</th>
              <th className="py-3.5 px-4">Chỉ định luồng xử lý</th>
              <th className="py-3.5 px-4">Kết quả</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-normal">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 text-xs italic">
                  Chưa có dữ liệu. Hãy đặt con trỏ vào ô nhập và dùng súng quét mã vạch để bắt đầu nhập kho.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className={`transition ${
                    log.isSuccess
                      ? 'hover:bg-slate-800/40 text-slate-200'
                      : 'bg-rose-950/20 hover:bg-rose-950/30 text-rose-200'
                  }`}
                >
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{log.time}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-cyan-400 text-sm tracking-wide">
                    {log.tracking_code}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                    <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${getBadgeStyle(
                        log.next_action
                      )}`}
                    >
                      {log.is_flagged && <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      {getActionLabel(log.next_action)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {log.isSuccess ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Thành công
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                        <XCircle className="w-3.5 h-3.5" /> {log.errorMessage}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
