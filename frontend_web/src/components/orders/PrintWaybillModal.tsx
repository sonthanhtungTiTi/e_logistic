import React from 'react';
import { Printer, Download, X, Package } from 'lucide-react';
import type { Order } from '../../types/order.types';
import { Barcode128 } from '../shared/Barcode128';
import { QRCodeSVG } from '../shared/QRCodeSVG';

interface PrintWaybillModalProps {
  order: Order;
  onClose: () => void;
}

export const PrintWaybillModal: React.FC<PrintWaybillModalProps> = ({ order, onClose }) => {
  const handleTriggerPrint = () => {
    window.print();
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const trackingCode = order.trackingCode || order.trackingNumber || 'ELG-WAYBILL';

  // Safe fallback extractors for sender and receiver
  const senderName = order.pickupAddress?.fullName || (order as any).senderName || 'Người Gửi';
  const senderPhone = order.pickupAddress?.phone || (order as any).senderPhone || 'N/A';
  const senderAddressText = [
    order.pickupAddress?.address,
    order.pickupAddress?.district,
    order.pickupAddress?.province
  ].filter(Boolean).join(', ') || (order as any).senderAddress || 'N/A';

  const receiverName = order.deliveryAddress?.fullName || (order as any).recipientName || 'Người Nhận';
  const receiverPhone = order.deliveryAddress?.phone || (order as any).recipientPhone || 'N/A';
  const receiverAddressText = [
    order.deliveryAddress?.address,
    order.deliveryAddress?.district,
    order.deliveryAddress?.province
  ].filter(Boolean).join(', ') || (order as any).recipientAddress || 'N/A';

  const itemsList = order.items || [];
  const totalWeight = order.chargeableWeight || order.chargeableWeightKg || order.actualWeight || order.weightKg || 0;
  const dimText = `${order.dimensions?.length || 0}x${order.dimensions?.width || 0}x${order.dimensions?.height || 0} cm`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:bg-white print:p-0">
      
      {/* Dynamic CSS injection for clean A6 printing */}
      <style>{`
        @media print {
          @page {
            size: A6 portrait;
            margin: 0;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-waybill-card, #printable-waybill-card * {
            visibility: visible !important;
          }
          #printable-waybill-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            border-radius: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-lg bg-white text-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 print:shadow-none print:p-0">
        
        {/* Modal Toolbar (Hidden when printing) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 print-hide">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
            <Printer className="w-4 h-4 text-blue-600" />
            Nhãn Vận Đơn Điện Tử (A6 Standard Format)
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINTABLE WAYBILL CARD AREA */}
        <div
          id="printable-waybill-card"
          className="border-2 border-slate-900 p-4 space-y-3 font-sans text-xs bg-white text-black rounded-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 gap-2">
            <div className="shrink-0">
              <h1 className="font-black text-lg tracking-wider text-black whitespace-nowrap leading-none">E-LOGISTIC</h1>
              <span className="text-[9px] font-bold block uppercase text-slate-700 whitespace-nowrap mt-0.5">Pharma Cold-Chain Express</span>
            </div>
            <div className="text-right flex flex-col items-end min-w-0">
              <span className="text-[9px] font-bold block uppercase text-slate-600">DỊCH VỤ</span>
              <div className="flex items-center gap-1 font-mono font-bold text-[10px] bg-slate-100 px-2 py-0.5 border border-slate-400 rounded text-slate-900 mt-0.5">
                <span className="uppercase">{order.serviceType || 'EXPRESS'}</span>
              </div>
            </div>
          </div>

          {/* Barcode & Tracking Code Section (Scannable Code 128 + QR Code) */}
          <div className="text-center py-2.5 border-b border-slate-900 space-y-2 bg-slate-50/50 rounded-lg p-2">
            <div className="font-mono text-2xl font-black tracking-widest text-black">
              {trackingCode}
            </div>

            <div className="flex items-center justify-center gap-4 px-2">
              {/* High-Resolution Code128 Barcode for Scanners */}
              <div className="flex-1 min-w-0 max-w-[270px] bg-white p-1 border border-slate-900 rounded">
                <Barcode128 value={trackingCode} height={55} moduleWidth={2.2} showText={false} />
              </div>

              {/* QR Code for Mobile App Camera Scanners */}
              <QRCodeSVG value={trackingCode} size={75} />
            </div>

            <div className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wide">
              Quét mã vạch Code128 / QR Code để cập nhật trạng thái tự động
            </div>
          </div>

          {/* Sender & Receiver Address Grid */}
          <div className="grid grid-cols-2 gap-3 text-[11px] border-b border-slate-300 pb-3">
            <div>
              <span className="font-bold block uppercase text-[9px] text-slate-600">Người Gửi (SENDER):</span>
              <div className="font-bold text-slate-900">{senderName}</div>
              <div className="font-mono text-slate-700">{senderPhone}</div>
              <div className="text-[10px] text-slate-700 leading-tight mt-0.5">{senderAddressText}</div>
            </div>

            <div className="border-l border-slate-300 pl-3">
              <span className="font-bold block uppercase text-[9px] text-slate-600">Người Nhận (RECEIVER):</span>
              <div className="font-bold text-slate-900">{receiverName}</div>
              <div className="font-mono text-slate-700">{receiverPhone}</div>
              <div className="text-[10px] text-slate-700 leading-tight mt-0.5">{receiverAddressText}</div>
            </div>
          </div>

          {/* Package Details */}
          <div className="grid grid-cols-3 gap-1 text-[10px] border-b border-slate-300 pb-2 text-center">
            <div>
              <span className="block text-slate-500 font-bold">TRỌNG LƯỢNG</span>
              <span className="font-mono font-bold text-xs text-slate-900">{totalWeight} kg</span>
            </div>
            <div>
              <span className="block text-slate-500 font-bold">KÍCH THƯỚC</span>
              <span className="font-mono text-xs text-slate-900">{dimText}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-bold">TIỀN COD THU HỘ</span>
              <span className="font-mono font-black text-xs text-slate-900">{formatCurrency(order.codAmount || 0)}</span>
            </div>
          </div>

          {/* Items List & Signature Note */}
          <div className="space-y-1 text-[10px] pt-1">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <Package className="w-3 h-3 text-slate-600" />
              Nội dung hàng hóa ({itemsList.length > 0 ? itemsList.length : 1} sản phẩm):
            </div>
            <ul className="list-disc list-inside text-slate-700">
              {itemsList.length > 0 ? (
                itemsList.map((it, idx) => (
                  <li key={idx} className="truncate">{it.name} (x{it.quantity})</li>
                ))
              ) : (
                <li>Dược phẩm & Hàng hóa tiêu chuẩn E-Logistic</li>
              )}
            </ul>
          </div>

          <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between items-end text-[9px] text-slate-600">
            <div>Chữ ký người nhận / Xác nhận hàng nguyên vẹn</div>
            <div className="font-mono text-[8px]">In lúc: {new Date().toLocaleString('vi-VN')}</div>
          </div>
        </div>

        {/* Action Buttons Toolbar (Hidden when printing) */}
        <div className="flex items-center justify-between pt-2 print-hide">
          <p className="text-[11px] text-slate-500 italic">
            * Chọn "Lưu dưới dạng PDF" trong cửa sổ in để tải file .PDF về máy.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition cursor-pointer"
            >
              Đóng
            </button>

            <button
              onClick={handleTriggerPrint}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              In / Tải Xuống PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
