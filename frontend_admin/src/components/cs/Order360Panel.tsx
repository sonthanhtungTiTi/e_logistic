import React, { useState } from 'react';
import type { TicketContextData } from '@/types/ticket.types';
import { MaskedField } from './MaskedField';
import { useRevealPii } from '@/hooks/useTicketContext';
import {
  Package,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  History,
  FileCheck,
} from 'lucide-react';

interface Order360PanelProps {
  contextData: TicketContextData;
  isLoading?: boolean;
}

export const Order360Panel: React.FC<Order360PanelProps> = ({ contextData, isLoading }) => {
  const { order, orderTimeline = [], custodyLog = [], requesterProfile, relatedTickets = [] } = contextData;
  const { mutateAsync: revealPii } = useRevealPii(contextData.ticket._id);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    orderInfo: true,
    contact: true,
    timeline: false,
    custody: false,
    related: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleRevealField = async (field: 'phone' | 'address' | 'name') => {
    const res = await revealPii();
    return res[field];
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 animate-pulse bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded" />
        <div className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Package className="w-4 h-4 text-blue-600" />
          Hồ sơ 360° Đơn & Khách hàng
        </h3>
      </div>

      <div className="p-3 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
        {/* SECTION 1: THÔNG TIN VẬN ĐƠN */}
        {order ? (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => toggleSection('orderInfo')}
              className="flex items-center justify-between w-full text-xs font-bold text-slate-800 dark:text-slate-200 py-1"
            >
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                Vận đơn: {order.trackingCode}
              </span>
              {openSections.orderInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {openSections.orderInfo && (
              <div className="mt-2 text-xs space-y-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{order.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tiền thu hộ COD:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {order.codAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phí giao hàng:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {order.shippingFee.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                {order.currentHub && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kho hiện tại:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {order.currentHub.name} ({order.currentHub.hubCode})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2 text-xs text-slate-400 italic">Ticket không liên kết vận đơn cụ thể</div>
        )}

        {/* SECTION 2: THÔNG TIN LIÊN HỆ & BẢO MẬT PII */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => toggleSection('contact')}
            className="flex items-center justify-between w-full text-xs font-bold text-slate-800 dark:text-slate-200 py-1"
          >
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Thông tin liên hệ & PII
            </span>
            {openSections.contact ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.contact && (
            <div className="mt-2 space-y-2.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
              <div>
                <span className="text-[11px] text-slate-500 block mb-0.5">Người yêu cầu / Seller:</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {requesterProfile.name}
                </span>
                {requesterProfile.isVip && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white">
                    VIP
                  </span>
                )}
              </div>

              <MaskedField
                label="Số điện thoại người nhận:"
                maskedValue={order?.receiverPhone || requesterProfile.phoneMasked}
                onReveal={() => handleRevealField('phone')}
              />

              <MaskedField
                label="Tên người nhận:"
                maskedValue={order?.receiverName || requesterProfile.name}
                onReveal={() => handleRevealField('name')}
              />

              <MaskedField
                label="Địa chỉ giao hàng:"
                maskedValue={order?.receiverAddress || '***'}
                onReveal={() => handleRevealField('address')}
              />
            </div>
          )}
        </div>

        {/* SECTION 3: HÀNH TRÌNH VẬN ĐƠN (TIMELINE) */}
        {orderTimeline.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => toggleSection('timeline')}
              className="flex items-center justify-between w-full text-xs font-bold text-slate-800 dark:text-slate-200 py-1"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Hành trình đơn hàng ({orderTimeline.length})
              </span>
              {openSections.timeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {openSections.timeline && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                {orderTimeline.map((item, idx) => (
                  <div key={idx} className="flex gap-2 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 my-1" />
                      {idx < orderTimeline.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />}
                    </div>
                    <div className="pb-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(item.timestamp).toLocaleString('vi-VN')} {item.locationName ? `· ${item.locationName}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: CHUỖI BÀN GIAO (CUSTODY LOG) */}
        {custodyLog.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => toggleSection('custody')}
              className="flex items-center justify-between w-full text-xs font-bold text-slate-800 dark:text-slate-200 py-1"
            >
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                Chuỗi bàn giao ({custodyLog.length})
              </span>
              {openSections.custody ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {openSections.custody && (
              <div className="mt-2 space-y-1.5 text-xs max-h-40 overflow-y-auto">
                {custodyLog.map((log, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{log.transferType}</div>
                    <div className="text-[11px] text-slate-500">
                      Từ: {log.fromActor?.name} ({log.fromActor?.role}) → Đến: {log.toActor?.name} ({log.toActor?.role})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: TICKET KHÁC CỦA KHÁCH HÀNG */}
        {relatedTickets.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => toggleSection('related')}
              className="flex items-center justify-between w-full text-xs font-bold text-slate-800 dark:text-slate-200 py-1"
            >
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-purple-600" />
                Lịch sử ticket gần đây ({relatedTickets.length})
              </span>
              {openSections.related ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {openSections.related && (
              <div className="mt-2 space-y-1.5">
                {relatedTickets.map((t) => (
                  <div
                    key={t._id}
                    className="p-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center"
                  >
                    <div>
                      <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">{t.ticketCode}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{t.subject}</div>
                    </div>
                    <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-slate-200 dark:bg-slate-700">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
