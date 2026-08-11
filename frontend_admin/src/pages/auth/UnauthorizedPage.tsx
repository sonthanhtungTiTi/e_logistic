import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md glass-panel p-8 rounded-3xl border border-rose-500/30 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-white">Truy Cập Bị Tạm Chặn (403 Forbidden)</h3>
        <p className="text-xs text-slate-400">
          Tài khoản của bạn không có đủ thẩm quyền vai trò (Role-Based Control) để truy cập vào phân hệ chức năng chuyên biệt này.
        </p>
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Quay Về Dashboard
        </Link>
      </div>
    </div>
  );
};
