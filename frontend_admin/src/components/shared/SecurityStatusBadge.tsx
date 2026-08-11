import React from 'react';
import { ShieldCheck, Lock, AlertTriangle } from 'lucide-react';

interface SecurityStatusBadgeProps {
  isActive: boolean;
  failedAttempts: number;
}

export const SecurityStatusBadge: React.FC<SecurityStatusBadgeProps> = ({ isActive, failedAttempts }) => {
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
        <Lock className="w-3 h-3" /> Đã Tạm Khóa (5/5 Lỗi)
      </span>
    );
  }

  if (failedAttempts > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
        <AlertTriangle className="w-3 h-3" /> Cảnh Báo ({failedAttempts}/5 Lỗi)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
      <ShieldCheck className="w-3 h-3" /> An Toàn BÌNH THƯỜNG
    </span>
  );
};
