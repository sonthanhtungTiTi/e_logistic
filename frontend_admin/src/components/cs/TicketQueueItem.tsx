import React from 'react';
import type { TicketQueueItemData } from '@/types/ticket.types';
import { SlaBadge } from './SlaBadge';
import { User, UserCheck } from 'lucide-react';

interface TicketQueueItemProps {
  ticket: TicketQueueItemData;
  isSelected: boolean;
  onSelect: (ticketId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  DELIVERY_DELAY: 'Giao trễ',
  DAMAGED_GOODS: 'Hư hỏng',
  LOST_GOODS: 'Thất lạc',
  COD_DISPUTE: 'Sai COD',
  ADDRESS_CHANGE: 'Đổi địa chỉ',
  FEE_DISPUTE: 'Cước phí',
  PICKUP_FAIL: 'Không lấy được',
  OTHER: 'Khác',
};

export const TicketQueueItem: React.FC<TicketQueueItemProps> = ({
  ticket,
  isSelected,
  onSelect,
}) => {
  const requesterName =
    ticket.sellerId?.companyName || ticket.sellerId?.fullName || 'Khách hàng';
  const assigneeName =
    ticket.assigneeId?.fullName || ticket.assignedTo?.fullName || null;
  const categoryText = CATEGORY_LABELS[ticket.category] || ticket.category;

  return (
    <div
      onClick={() => onSelect(ticket._id)}
      className={`group relative p-3 transition-all cursor-pointer border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
        isSelected
          ? 'bg-blue-50/60 dark:bg-blue-950/30 border-l-4 border-l-blue-600 pl-2.5'
          : 'border-l-4 border-l-transparent'
      }`}
    >
      {/* Top row: Code + SLA Badge */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
            {ticket.ticketCode}
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {categoryText}
          </span>
        </div>

        <SlaBadge
          remainingMs={ticket.remainingMs}
          priority={ticket.priority}
          breached={ticket.sla?.breachedResolution}
        />
      </div>

      {/* Middle row: Subject / Title */}
      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1 mb-1">
        {ticket.subject}
      </div>

      {/* Last message preview if any */}
      {ticket.lastMessagePreview && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-1.5">
          {ticket.lastMessagePreview}
        </div>
      )}

      {/* Bottom row: Requester & Assignee */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="truncate max-w-[130px] font-medium text-slate-700 dark:text-slate-300">
          {requesterName}
        </span>

        <div className="flex items-center gap-1">
          {assigneeName ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <UserCheck className="w-3 h-3" />
              <span className="truncate max-w-[90px]">{assigneeName}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400 italic">
              <User className="w-3 h-3" />
              Chưa gán
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
