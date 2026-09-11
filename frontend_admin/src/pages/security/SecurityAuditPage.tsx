import React, { useState } from 'react';
import { AuditStreamViewer } from '../../components/admin/AuditStreamViewer';
import { AuditFilterBar } from '../../components/shared/AuditFilterBar';
import { INITIAL_AUDIT_LOGS } from '../../mockData';
import { ShieldAlert, RefreshCw, Activity, Lock, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const SecurityAuditPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');

  const filteredLogs = INITIAL_AUDIT_LOGS.filter((log) => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm) ||
      log.note.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const totalLogs = INITIAL_AUDIT_LOGS.length;
  const loginCount = INITIAL_AUDIT_LOGS.filter(l => l.action.includes('LOGIN')).length;
  const warningCount = INITIAL_AUDIT_LOGS.filter(l => l.action.includes('BLOCK') || l.action.includes('REJECT') || l.action.includes('LOCK')).length;
  const uniqueIps = new Set(INITIAL_AUDIT_LOGS.map(l => l.ipAddress)).size;

  return (
    <div className="space-y-6 pb-12">
      {/* TẦNG 1: Page Header & KPI Summary Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Bảo Mật &amp; Audit Log 2-Lớp</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhật ký truy vết thao tác hệ thống Realtime, giám sát đăng nhập &amp; phát hiện hành vi bất thường
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" /> Tải Lại Nhật Ký
            </button>
          </div>
        </div>

        {/* 4 Thẻ KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Audit Logs</span>
              <span className="text-2xl font-black text-white mt-1 block font-mono">{totalLogs}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Thao Tác Đăng Nhập</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">{loginCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Thao Tác Cảnh Báo</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block font-mono">{warningCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">IP Đang Giám Sát</span>
              <span className="text-2xl font-black text-cyan-400 mt-1 block font-mono">{uniqueIps}</span>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Lock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <AuditFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedAction={selectedAction}
        onActionChange={setSelectedAction}
      />
      <AuditStreamViewer logs={filteredLogs} />
    </div>
  );
};

