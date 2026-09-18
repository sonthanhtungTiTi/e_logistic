import React from 'react';
import { Info, CreditCard, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

interface CreateOrderBottomBarProps {
  isShopInfoComplete: boolean;
  setShowInfoModal: (val: boolean) => void;
  chargeableWeight: number;
  totalActualWeight: number;
  productsLength: number;
  volumetricWeight: number;
  handleGetQuote: () => void;
  quoting: boolean;
  submitting: boolean;
  handleSubmitOrder: (force?: boolean) => void;
}

export const CreateOrderBottomBar: React.FC<CreateOrderBottomBarProps> = ({
  isShopInfoComplete,
  setShowInfoModal,
  chargeableWeight,
  totalActualWeight,
  productsLength,
  volumetricWeight,
  handleGetQuote,
  quoting,
  submitting,
  handleSubmitOrder,
}) => {
  return (
    <div className="sticky bottom-0 sm:bottom-4 z-30 p-3 sm:p-4 rounded-none sm:rounded-3xl glass-panel border-t sm:border border-slate-200 dark:border-slate-700/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      {!isShopInfoComplete ? (
        <div
          onClick={() => setShowInfoModal(true)}
          className="w-full text-rose-500 text-xs sm:text-sm font-bold text-center cursor-pointer hover:underline animate-pulse flex items-center justify-center gap-2 py-1"
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Vui lòng xác thực email và liên kết tài khoản ngân hàng trước khi tạo đơn!</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Tính cước:{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {chargeableWeight.toFixed(1)} kg
                </strong>
              </span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              (Thực: {totalActualWeight.toFixed(1)}kg | DIM: {volumetricWeight.toFixed(1)}kg)
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Step 1: Get Quote */}
            <button
              type="button"
              onClick={handleGetQuote}
              disabled={quoting || submitting}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 min-h-[44px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition disabled:opacity-50"
            >
              {quoting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 dark:text-blue-400" />
                  <span>Đang Tính Cước...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Xem Báo Giá Trước</span>
                </>
              )}
            </button>

            {/* Step 2: Confirm Order */}
            <button
              type="button"
              onClick={() => handleSubmitOrder(false)}
              disabled={submitting || quoting}
              className="flex-1 sm:flex-initial px-5 sm:px-7 py-2.5 sm:py-3 min-h-[44px] rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang Tạo Đơn Hàng...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Tạo Đơn Hàng</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
