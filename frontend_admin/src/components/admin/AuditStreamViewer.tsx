import React, { useState } from 'react';
import { Filter, Search, ShieldCheck } from 'lucide-react';
import type { AuditLog } from '../../types';

interface AuditStreamViewerProps {
  auditLogs?: AuditLog[];
  logs?: AuditLog[];
}

export const AuditStreamViewer: React.FC<AuditStreamViewerProps> = ({ auditLogs, logs }) => {
  const dataLogs = logs || auditLogs || [];
  const [logFilter, setLogFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = dataLogs.filter((log) => {
    const matchesFilter = logFilter === 'ALL' || log.action === logFilter;
    const matchesSearch =
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.note.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Realtime Security Audit Logs
          </div>
          <h3 className="text-2xl font-black text-white">Nhật Ký Thao Tác Hệ Thống Toàn Diện</h3>
          <p className="text-xs text-slate-400">Ghi lại toàn bộ hành vi đăng nhập, khóa tài khoản, đổi mật khẩu & tạo đơn</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo email, hành động..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input rounded-xl pl-9 pr-3 py-1.5 text-xs w-56"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="glass-input rounded-xl px-3 py-1.5 text-xs"
            >
              <option value="ALL" className="bg-slate-900">Tất Cả Loại Log</option>
              <option value="LOGIN_SUCCESS" className="bg-slate-900">LOGIN_SUCCESS</option>
              <option value="PASSWORD_CHANGED" className="bg-slate-900">PASSWORD_CHANGED</option>
              <option value="ADMIN_STATUS_CHANGE" className="bg-slate-900">ADMIN_STATUS_CHANGE</option>
              <option value="ORDER_DISPATCHED" className="bg-slate-900">ORDER_DISPATCHED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log Feed List */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        {filteredLogs.map((log) => (
          <div 
            key={log.id} 
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  log.action === 'LOGIN_SUCCESS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  log.action === 'ADMIN_STATUS_CHANGE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {log.action}
                </span>
                <span className="text-purple-300 font-bold">[{log.userEmail}]</span>
                <span className="text-[10px] text-slate-500">IP: {log.ipAddress}</span>
              </div>
              <div className="text-slate-300 text-xs font-sans">{log.note}</div>
            </div>

            <div className="text-[10px] text-slate-500 shrink-0 font-mono">
              {log.timestamp}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
