import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface MaskedFieldProps {
  maskedValue?: string | null;
  onReveal: () => Promise<string | undefined>;
  label?: string;
  className?: string;
}

export const MaskedField: React.FC<MaskedFieldProps> = ({
  maskedValue,
  onReveal,
  label,
  className = '',
}) => {
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [isMaskedToggle, setIsMaskedToggle] = useState(false);

  const handleReveal = async () => {
    if (revealedValue) {
      setIsMaskedToggle(!isMaskedToggle);
      return;
    }

    try {
      setIsLoading(true);
      const val = await onReveal();
      if (val) {
        setRevealedValue(val);
        setHasRevealed(true);
        setIsMaskedToggle(false);
        toast.info('Đã mở khóa thông tin bảo mật. Hoạt động này đã được ghi vào Audit Log.');
      } else {
        toast.error('Không tìm thấy thông tin gốc.');
      }
    } catch {
      toast.error('Lỗi khi mở khóa thông tin PII.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayValue = revealedValue && !isMaskedToggle ? revealedValue : maskedValue || '***';

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>}
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 select-all border border-slate-200 dark:border-slate-700 ${
            revealedValue && !isMaskedToggle ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
          }`}
        >
          {displayValue}
        </span>

        <button
          type="button"
          onClick={handleReveal}
          disabled={isLoading}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          title={revealedValue ? (isMaskedToggle ? 'Hiện thông tin' : 'Ẩn lại') : 'Mở khóa thông tin thực'}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : revealedValue && !isMaskedToggle ? (
            <EyeOff className="w-4 h-4 text-blue-600" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>

        {hasRevealed && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
            <ShieldCheck className="w-3 h-3" />
            Đã ghi nhận truy cập
          </span>
        )}
      </div>
    </div>
  );
};
