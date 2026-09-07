import React, { useState } from 'react';
import { DollarSign, CheckCircle2, Clock, Building2 } from 'lucide-react';

export const ShipperWalletPage: React.FC = () => {
  const [isHandedOver, setIsHandedOver] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  const collectedOrders = [
    { code: 'VND-551829', amount: 350000, buyer: 'Chị Nguyễn Thu Thảo', time: '14:20' },
    { code: 'VND-551812', amount: 820000, buyer: 'Anh Hoàng Long', time: '11:45' },
    { code: 'VND-551790', amount: 210000, buyer: 'Chị Lê Hương', time: '09:30' },
  ];

  const totalCodCollected = collectedOrders.reduce((sum, o) => sum + o.amount, 0);

  const handleHandoverToCashier = () => {
    setIsHandedOver(true);
    setMsg('✅ Đã tạo phiếu nộp tiền mặt COD tại quầy! Vui lòng nhờ Kế toán/Thủ quỹ bưu cục quét mã xác nhận.');
  };

  return (
    <div className="space-y-4">
      {/* Wallet Card */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-850 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block">Tiền Mặt COD Thu Hộ Hôm Nay</span>
              <h2 className="text-xl font-black text-white">{totalCodCollected.toLocaleString('vi-VN')} đ</h2>
            </div>
          </div>

          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
              isHandedOver
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            {isHandedOver ? 'Đã Nộp Quầy' : 'Chưa Nộp Bưu Cục'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block">Số đơn đã thu tiền</span>
            <span className="font-bold text-slate-200">{collectedOrders.length} đơn</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Bưu cục đối soát</span>
            <span className="font-bold text-cyan-400">HUB_TB (Tân Bình)</span>
          </div>
        </div>

        {!isHandedOver ? (
          <button
            onClick={handleHandoverToCashier}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Building2 className="w-4 h-4" /> Bàn Giao Tiền COD Tại Quầy Bưu Cục
          </button>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Mã Phiếu Bàn Giao: COD-TB-{Math.floor(1000 + Math.random() * 9000)}
            </span>
          </div>
        )}
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
          {msg}
        </div>
      )}

      {/* Detail Transactions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          Chi Tiết Các Khoản COD Đã Thu
        </h3>

        <div className="space-y-2">
          {collectedOrders.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-850 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-cyan-400 block">{item.code}</span>
                <span className="text-[11px] text-slate-400">
                  {item.buyer} • {item.time}
                </span>
              </div>

              <div className="text-right">
                <span className="font-bold text-emerald-400 block">+{item.amount.toLocaleString('vi-VN')} đ</span>
                <span className="text-[10px] text-slate-500">Tiền mặt</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShipperWalletPage;
