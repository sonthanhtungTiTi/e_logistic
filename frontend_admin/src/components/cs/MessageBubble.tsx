import React from 'react';
import type { TicketMessage } from '@/types/ticket.types';
import { Lock, Clock, CheckCircle2, User, Headphones } from 'lucide-react';

interface MessageBubbleProps {
  message: TicketMessage;
  currentUserId?: string;
  canViewInternal?: boolean;
}

function formatMsgDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
  } catch {
    return dateStr;
  }
}

// Simple text with line breaks and basic formatting
function renderContent(text?: string) {
  if (!text) return null;
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {text}
    </div>
  );
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  canViewInternal = true,
}) => {
  const isInternal = message.visibility === 'INTERNAL';
  const isStaff = ['CS', 'ADMIN', 'CUSTOMER_SERVICE', 'OPERATIONS'].includes(
    message.senderRole?.toUpperCase() || ''
  );

  // If user cannot view internal message, hide it
  if (isInternal && !canViewInternal) {
    return null;
  }

  const content = message.body || message.message || '';

  // Internal Note Bubble Style
  if (isInternal) {
    return (
      <div className="my-2 p-3 rounded-lg border border-amber-200 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-800 text-slate-800 dark:text-slate-100 max-w-2xl mx-auto w-full shadow-xs">
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-200/60 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 font-medium">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold">Ghi chú nội bộ</span>
            <span className="text-slate-500 dark:text-slate-400">· bởi {message.senderName}</span>
          </div>
          <span className="text-[11px] text-slate-500">{formatMsgDate(message.createdAt)}</span>
        </div>
        <div className="text-amber-950 dark:text-amber-100">
          {renderContent(content)}
        </div>
      </div>
    );
  }

  // PUBLIC message from Staff (CS / Admin) -> Aligned Right
  if (isStaff) {
    return (
      <div className="flex flex-col items-end my-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1 mr-1">
          <Headphones className="w-3 h-3 text-blue-600" />
          <span className="font-medium text-slate-700 dark:text-slate-300">{message.senderName}</span>
          <span>·</span>
          <span>{formatMsgDate(message.createdAt)}</span>
        </div>
        <div
          className={`max-w-[80%] rounded-2xl rounded-tr-xs px-4 py-2.5 bg-blue-600 text-white shadow-xs ${
            message.status === 'sending' ? 'opacity-70' : ''
          }`}
        >
          {renderContent(content)}
          <div className="flex justify-end items-center gap-1 mt-1 text-[11px] text-blue-100">
            {message.status === 'sending' ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 animate-spin" /> Đang gửi...
              </span>
            ) : (
              <CheckCircle2 className="w-3 h-3 text-blue-200" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // PUBLIC message from Requester / Seller / Customer -> Aligned Left
  return (
    <div className="flex flex-col items-start my-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1 ml-1">
        <User className="w-3 h-3 text-slate-600" />
        <span className="font-medium text-slate-700 dark:text-slate-300">{message.senderName}</span>
        <span>·</span>
        <span>{formatMsgDate(message.createdAt)}</span>
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-tl-xs px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs">
        {renderContent(content)}
      </div>
    </div>
  );
};
