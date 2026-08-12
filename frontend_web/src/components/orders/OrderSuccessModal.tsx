import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Copy, Printer, PlusCircle, ListFilter, Check, X } from 'lucide-react';
import type { Order } from '../../types/order.types';
import { PrintWaybillModal } from './PrintWaybillModal';

interface OrderSuccessModalProps {
  order: Order;
  onClose?: () => void;
  onCreateNext?: () => void;
  onViewList?: () => void;
  onPrintWaybill?: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onCreateNext,
  onViewList,
  onPrintWaybill
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const trackingCode = order.trackingCode || order.trackingNumber || 'ELG-999';

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewListClick = () => {
    if (onViewList) {
      onViewList();
    } else {
      navigate('/seller/orders');
    }
  };

  const handleCreateNextClick = () => {
    if (onCreateNext) {
      onCreateNext();
    } else if (onClose) {
      onClose();
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
          
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Header Badge (Matching Wireframe 2) */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Tạo Đơn Hàng Thành Công!</h2>
            <p className="text-xs text-slate-400">
              Đơn hàng đã được lưu vào hệ thống và sẵn sàng để lấy hàng.
            </p>
          </div>

          {/* Tracking Code Box (Matching Wireframe 2) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MÃ VẬN ĐƠN (TRACKING CODE)</span>
              <button
                onClick={handleCopy}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã sao chép!' : 'Sao chép mã'}
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-mono text-xl font-black text-blue-400 tracking-wider">{trackingCode}</span>
              {/* Simulated Barcode */}
              <div className="flex items-center gap-0.5 opacity-60">
                <div className="w-1 h-6 bg-slate-400"></div>
                <div className="w-0.5 h-6 bg-slate-400"></div>
                <div className="w-1.5 h-6 bg-slate-400"></div>
                <div className="w-0.5 h-6 bg-slate-400"></div>
                <div className="w-1 h-6 bg-slate-400"></div>
                <div className="w-2 h-6 bg-slate-400"></div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Cước Phí Vận Chuyển</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(order.shippingFee || order.cost || 0)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tiền Thu Hộ COD</span>
                <span className="font-mono font-bold text-amber-400">{formatCurrency(order.codAmount || 0)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Matching Wireframe 2) */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => {
                if (onPrintWaybill) {
                  onPrintWaybill();
                } else {
                  setShowPrintModal(true);
                }
              }}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> In Nhãn Vận Đơn A6 (Print Waybill Label)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCreateNextClick}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Tạo Đơn Tiếp Theo
              </button>

              <button
                onClick={handleViewListClick}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <ListFilter className="w-4 h-4 text-blue-400" /> Xem Danh Sách Đơn
              </button>
            </div>
          </div>

        </div>
      </div>

      {showPrintModal && (
        <PrintWaybillModal
          order={order}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </>
  );
};
