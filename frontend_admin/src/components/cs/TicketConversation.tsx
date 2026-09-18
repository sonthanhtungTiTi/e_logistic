import React, { useRef, useEffect, useState } from 'react';
import type { TicketContextData } from '@/types/ticket.types';
import { SlaBadge } from './SlaBadge';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { useSendMessage, useClaimTicket, useTransitionTicket } from '@/hooks/useTicketContext';
import {
  UserCheck,
  CheckCircle,
  DollarSign,
  AlertTriangle,
  Loader2,
  Inbox,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

interface TicketConversationProps {
  contextData: TicketContextData | null;
  isLoading?: boolean;
}

export const TicketConversation: React.FC<TicketConversationProps> = ({
  contextData,
  isLoading,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  const ticket = contextData?.ticket;
  const permissions = contextData?.permissions;
  const messages = contextData?.messages || [];

  const { mutateAsync: sendMessage, isPending: isSending } = useSendMessage(ticket?._id || null);
  const { mutateAsync: claimTicket, isPending: isClaiming } = useClaimTicket();
  const { mutateAsync: transitionTicket, isPending: isTransitioning } = useTransitionTicket();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-sm">Đang tải cuộc hội thoại...</span>
      </div>
    );
  }

  if (!ticket || !contextData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 gap-3 p-8 text-center">
        <Inbox className="w-12 h-12 stroke-1 text-slate-300 dark:text-slate-600" />
        <div>
          <div className="font-semibold text-slate-700 dark:text-slate-300">Chưa chọn ticket nào</div>
          <div className="text-xs text-slate-400 mt-1">Chọn một ticket từ hàng đợi bên trái để bắt đầu xử lý</div>
        </div>
      </div>
    );
  }

  const handleClaim = async () => {
    try {
      await claimTicket(ticket._id);
    } catch {
      // Toast handled by hook
    }
  };

  const handleResolveSubmit = async () => {
    try {
      await transitionTicket({
        ticketId: ticket._id,
        status: 'RESOLVED',
        resolutionNote,
      });
      setShowResolveDialog(false);
      setResolutionNote('');
    } catch {
      // Toast handled by hook
    }
  };

  const handleEscalate = async () => {
    try {
      await transitionTicket({
        ticketId: ticket._id,
        status: 'ESCALATED',
      });
    } catch {
      // Toast handled by hook
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/30 dark:bg-slate-950/30 min-w-0">
      {/* Header Bar */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            {ticket.ticketCode}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {ticket.status}
          </span>
          <SlaBadge
            remainingMs={ticket.remainingMs}
            priority={ticket.priority}
            breached={ticket.breached}
          />
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <User className="w-3.5 h-3.5" />
            <span>Phụ trách: {ticket.assignee?.fullName || 'Chưa nhận'}</span>
          </div>
        </div>

        {/* Action Buttons based on dynamic permissions */}
        <div className="flex items-center gap-1.5">
          {permissions?.canClaim && (
            <button
              type="button"
              onClick={handleClaim}
              disabled={isClaiming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50"
            >
              {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              Nhận ticket
            </button>
          )}

          {permissions?.canResolve && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
            <button
              type="button"
              onClick={() => setShowResolveDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Giải quyết xong
            </button>
          )}

          {permissions?.canEscalate && ticket.status !== 'ESCALATED' && (
            <button
              type="button"
              onClick={handleEscalate}
              disabled={isTransitioning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Escalate
            </button>
          )}

          {permissions?.canProposeRefund && (
            <button
              type="button"
              onClick={() => toast.info(`Hạn mức đền bù tối đa của bạn: ${permissions.maxRefundAmount.toLocaleString('vi-VN')} đ`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 shadow-xs"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Đền bù
            </button>
          )}
        </div>
      </div>

      {/* Ticket Subject Box */}
      <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 text-xs text-slate-800 dark:text-slate-200">
        <span className="font-semibold text-blue-900 dark:text-blue-300">Tiêu đề: </span>
        {ticket.subject}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-8">Chưa có tin nhắn nào trong ticket này</div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg._id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer Footer */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <MessageComposer
          onSendMessage={sendMessage}
          isSending={isSending}
          disabled={ticket.status === 'CLOSED'}
        />
      </div>

      {/* Resolve Dialog */}
      {showResolveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-2">
              Xác nhận giải quyết Ticket ({ticket.ticketCode})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Vui lòng nhập ghi chú tóm tắt hướng xử lý hoặc kết quả giải quyết cho khách hàng:
            </p>
            <textarea
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Ghi chú kết quả xử lý..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResolveDialog(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleResolveSubmit}
                disabled={isTransitioning}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Xác nhận Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
