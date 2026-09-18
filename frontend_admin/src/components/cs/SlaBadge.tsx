import React, { useState, useEffect } from 'react';
import type { TicketPriority } from '@/types/ticket.types';
import { AlertTriangle, Clock } from 'lucide-react';

interface SlaBadgeProps {
  remainingMs?: number | null;
  priority?: TicketPriority;
  breached?: boolean;
  className?: string;
}

function formatRemainingTime(ms: number): string {
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatted = hours > 0 ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s` : `${pad(minutes)}m ${pad(seconds)}s`;

  return isNegative ? `-${formatted}` : formatted;
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({
  remainingMs,
  priority = 'P3',
  breached = false,
  className = '',
}) => {
  const [countdownMs, setCountdownMs] = useState<number | null>(
    typeof remainingMs === 'number' ? remainingMs : null
  );

  useEffect(() => {
    if (typeof remainingMs !== 'number') {
      setCountdownMs(null);
      return;
    }
    setCountdownMs(remainingMs);

    const timer = setInterval(() => {
      setCountdownMs((prev) => (prev !== null ? prev - 1000 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingMs]);

  if (countdownMs === null) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ${className}`}>
        <Clock className="w-3 h-3" />
        <span>Không SLA</span>
      </span>
    );
  }

  const isBreached = breached || countdownMs <= 0;

  if (isBreached) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-red-600 text-white animate-pulse shadow-sm ${className}`}
        title="Đơn hàng / Ticket đã quá hạn cam kết SLA"
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>Quá hạn SLA ({formatRemainingTime(countdownMs)})</span>
      </span>
    );
  }

  // Styles based on Priority
  let badgeStyle = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
  if (priority === 'P1') {
    badgeStyle = 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-300 animate-pulse';
  } else if (priority === 'P2') {
    badgeStyle = 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-300';
  } else if (priority === 'P3') {
    badgeStyle = 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${badgeStyle} ${className}`}
    >
      <Clock className="w-3 h-3 shrink-0" />
      <span>SLA: {formatRemainingTime(countdownMs)}</span>
    </span>
  );
};
