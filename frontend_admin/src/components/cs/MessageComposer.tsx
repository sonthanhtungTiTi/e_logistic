import React, { useState, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Send, Lock, Globe, Loader2, AlertCircle } from 'lucide-react';
import { useCsWorkspaceStore } from '@/stores/csWorkspace.store';
import type { ComposerMode } from '@/stores/csWorkspace.store';

interface MessageComposerProps {
  onSendMessage: (payload: { body: string; visibility: ComposerMode; clientMsgId: string }) => Promise<unknown>;
  isSending?: boolean;
  disabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isSending = false,
  disabled = false,
}) => {
  const { composerMode, setComposerMode } = useCsWorkspaceStore();
  const [content, setContent] = useState('');
  const [showInternalConfirm, setShowInternalConfirm] = useState(false);
  const [hasConfirmedInternalOnce, setHasConfirmedInternalOnce] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto focus textarea on mode change
  useEffect(() => {
    textareaRef.current?.focus();
  }, [composerMode]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending || disabled) return;

    // First time sending internal note requires confirmation dialog
    if (composerMode === 'INTERNAL' && !hasConfirmedInternalOnce) {
      setShowInternalConfirm(true);
      return;
    }

    try {
      const clientMsgId = nanoid();
      await onSendMessage({
        body: trimmed,
        visibility: composerMode,
        clientMsgId,
      });
      setContent(''); // Only clear if success
    } catch {
      // Keep content on error so user doesn't lose text
    }
  };

  const handleConfirmInternalSend = async () => {
    setShowInternalConfirm(false);
    setHasConfirmedInternalOnce(true);
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      const clientMsgId = nanoid();
      await onSendMessage({
        body: trimmed,
        visibility: 'INTERNAL',
        clientMsgId,
      });
      setContent('');
    } catch {
      // Retain content
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const isInternal = composerMode === 'INTERNAL';

  return (
    <div
      className={`border rounded-xl transition-all duration-200 overflow-hidden shadow-xs ${
        isInternal
          ? 'bg-amber-50/70 border-amber-300 dark:bg-amber-950/20 dark:border-amber-700'
          : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
      }`}
    >
      {/* Tab Switcher */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setComposerMode('PUBLIC')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              !isInternal
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Trả lời công khai
          </button>

          <button
            type="button"
            onClick={() => setComposerMode('INTERNAL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              isInternal
                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Ghi chú nội bộ
          </button>
        </div>

        {isInternal && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            <Lock className="w-3 h-3" />
            Chỉ nhân viên nội bộ nhìn thấy
          </div>
        )}
      </div>

      {/* Input Textarea */}
      <div className="p-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          rows={3}
          placeholder={
            isInternal
              ? 'Nhập ghi chú trao đổi nội bộ CS/Điều phối/Kế toán (Không gửi cho khách hàng)...'
              : 'Nhập câu trả lời gửi đến khách hàng (Ctrl + Enter để gửi)...'
          }
          className={`w-full bg-transparent border-0 resize-none text-sm focus:outline-hidden text-slate-800 dark:text-slate-100 placeholder:text-slate-400 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">Ctrl</kbd> +{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">Enter</kbd> để gửi nhanh
          </span>

          <button
            type="button"
            onClick={handleSend}
            disabled={!content.trim() || isSending || disabled}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
              isInternal
                ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600'
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600'
            }`}
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                {isInternal ? 'Lưu ghi chú nội bộ' : 'Gửi phản hồi'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Internal Note Confirmation Dialog */}
      {showInternalConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                Xác nhận lưu Ghi chú nội bộ
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
              Tin nhắn này chỉ nhóm nhân viên nội bộ (CS, Điều phối, Admin) nhìn thấy. Khách hàng và người gửi đơn sẽ <strong>không</strong> thấy tin nhắn này. Bạn có muốn tiếp tục?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInternalConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmInternalSend}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                Đồng ý lưu nội bộ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
