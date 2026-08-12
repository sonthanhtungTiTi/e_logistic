import React from 'react';
import { Printer, X } from 'lucide-react';
import type { Order } from '../../types/order.types';

interface PrintWaybillModalProps {
  order: Order;
  onClose: () => void;
}

export const PrintWaybillModal: React.FC<PrintWaybillModalProps> = ({ order, onClose }) => {
  const handleTriggerPrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const trackingCode = order.trackingCode || order.trackingNumber || 'ELG-999';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Modal Toolbar (Hide when printing) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-700">
            <Printer className="w-4 h-4 text-blue-600" /> Xem Trước Nhãn Vận Đơn (A6 Format)
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINTABLE STICKER AREA (A6 proportions 100mm x 150mm) */}
        <div className="border-2 border-slate-900 p-4 space-y-3 font-sans text-xs bg-white text-black">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 gap-2">
            <div className="shrink-0">
              <h1 className="font-black text-base tracking-wider text-black whitespace-nowrap leading-none">E-LOGISTIC</h1>
              <span className="text-[9px] font-bold block uppercase text-slate-700 whitespace-nowrap mt-0.5">Pharma Cold-Chain Express</span>
            </div>
            <div className="text-right flex flex-col items-end min-w-0">
              <span className="text-[9px] font-bold block uppercase text-slate-600">HUB PHỤC VỤ</span>
              <div className="flex items-center gap-1 font-mono font-bold text-[10px] bg-slate-100 px-2 py-0.5 border border-slate-400 rounded text-slate-900 mt-0.5 max-w-full truncate">
                <span className="truncate max-w-[110px]">{order.pickupHub || 'HUB_SGN_01'}</span>
                <span className="shrink-0">➔</span>
                <span className="truncate max-w-[110px]">{order.deliveryHub || 'HUB_VTH_01'}</span>
              </div>
            </div>
          </div>

          {/* Barcode & Tracking Code */}
          <div className="text-center py-2 border-b border-slate-300">
            <div className="font-mono text-2xl font-black tracking-widest">{trackingCode}</div>
            <div className="flex justify-center items-center gap-1 my-1">
              <div className="w-1 h-10 bg-black"></div>
              <div className="w-0.5 h-10 bg-black"></div>
              <div className="w-2 h-10 bg-black"></div>
              <div className="w-1 h-10 bg-black"></div>
              <div className="w-3 h-10 bg-black"></div>
              <div className="w-0.5 h-10 bg-black"></div>
              <div className="w-1.5 h-10 bg-black"></div>
              <div className="w-2 h-10 bg-black"></div>
            </div>
          </div>

          {/* Address Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-slate-300 pb-2">
            <div>
              <span className="font-bold block uppercase text-[9px] text-slate-600">Từ (SENDER):</span>
              <div className="font-bold">{order.pickupAddress.fullName}</div>
              <div>{order.pickupAddress.phone}</div>
              <div className="text-[10px] text-slate-700">{order.pickupAddress.district}, {order.pickupAddress.province}</div>
            </div>
            <div className="border-l border-slate-300 pl-2">
              <span className="font-bold block uppercase text-[9px] text-slate-600">Đến (RECEIVER):</span>
              <div className="font-bold">{order.deliveryAddress.fullName}</div>
              <div>{order.deliveryAddress.phone}</div>
              <div className="text-[10px] text-slate-700">{order.deliveryAddress.address}, {order.deliveryAddress.district}, {order.deliveryAddress.province}</div>
            </div>
          </div>

          {/* Package Details */}
          <div className="grid grid-cols-3 gap-1 text-[10px] border-b border-slate-300 pb-2 text-center">
            <div>
              <span className="block text-slate-500 font-bold">TRỌNG LƯỢNG</span>
              <span className="font-mono font-bold text-xs">{order.chargeableWeight || order.actualWeight} kg</span>
            </div>
            <div>
              <span className="block text-slate-500 font-bold">KÍCH THƯỚC</span>
              <span className="font-mono text-xs">{order.dimensions?.length || 0}x{order.dimensions?.width || 0}x{order.dimensions?.height || 0} cm</span>
            </div>
            <div>
              <span className="block text-slate-500 font-bold">TIỀN COD</span>
              <span className="font-mono font-black text-xs">{formatCurrency(order.codAmount || 0)}</span>
            </div>
          </div>

          {/* Footer Items Manifest & Sign */}
          <div className="text-[10px] pt-1">
            <span className="font-bold">Nội dung hàng hóa ({order.items.length} món):</span>
            <ul className="list-disc list-inside text-slate-700">
              {order.items.map((it, idx) => (
                <li key={idx} className="truncate">{it.name} (x{it.quantity})</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons (Hide when printing) */}
        <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-xs text-slate-700"
          >
            Đóng
          </button>
          <button
            onClick={handleTriggerPrint}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30"
          >
            <Printer className="w-4 h-4" /> In Ngay (Print A6)
          </button>
        </div>

      </div>
    </div>
  );
};
