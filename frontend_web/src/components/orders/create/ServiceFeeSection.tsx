import React from 'react';
import {
  CreditCard,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Wallet,
  Truck,
  Package,
} from 'lucide-react';
import { formatNumberWithDots, parseDotsToNumber } from '../../../lib/formatters';
import type { QuoteResponseData } from '../../../types/order.types';
import type { ProductItem } from './types';

interface ServiceFeeSectionProps {
  codAmount: number;
  setCodAmount: (val: number) => void;
  goodsValue: number;
  setGoodsValue: (val: number) => void;
  quoteResult: QuoteResponseData | null;
  totalActualWeight: number;
  products: ProductItem[];
  deliveryMode: string;
  isHighValue: boolean;
  estimatedShippingFee: number;
  orderNote: string;
  setOrderNote: (val: string) => void;
  customOrderCode: string;
  setCustomOrderCode: (val: string) => void;
  shippingPayer: 'buyer' | 'seller';
  setShippingPayer: (val: 'buyer' | 'seller') => void;
  activeShippingFee: number;
  totalCollectFromBuyer: number;
  netSellerReceive: number;
}

export const ServiceFeeSection: React.FC<ServiceFeeSectionProps> = ({
  codAmount,
  setCodAmount,
  goodsValue,
  setGoodsValue,
  quoteResult,
  totalActualWeight,
  products,
  deliveryMode,
  isHighValue,
  estimatedShippingFee,
  orderNote,
  setOrderNote,
  customOrderCode,
  setCustomOrderCode,
  shippingPayer,
  setShippingPayer,
  activeShippingFee,
  totalCollectFromBuyer,
  netSellerReceive,
}) => {
  return (
    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
          <CreditCard className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            4. Tiền Thu Hộ (COD) &amp; Tính Cước
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Báo giá cước vận chuyển và tiền COD thực thu
          </p>
        </div>
      </div>

      {/* Inputs: COD & Goods Value */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tiền thu hộ COD (VNĐ)
          </label>
          <input
            id="input-cod-amount"
            type="text"
            inputMode="numeric"
            value={formatNumberWithDots(codAmount)}
            onChange={(e) => setCodAmount(parseDotsToNumber(e.target.value))}
            placeholder="0"
            className="w-full glass-input rounded-xl px-3.5 py-2.5 min-h-[44px] text-xs text-blue-600 dark:text-blue-400 font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none text-right focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Giá trị hàng hóa (Bảo hiểm)
          </label>
          <input
            id="input-goods-value"
            type="text"
            inputMode="numeric"
            value={formatNumberWithDots(goodsValue)}
            onChange={(e) => setGoodsValue(parseDotsToNumber(e.target.value))}
            placeholder="0"
            className="w-full glass-input rounded-xl px-3.5 py-2.5 min-h-[44px] text-xs text-slate-900 dark:text-white font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none text-right focus:border-blue-500"
          />
        </div>
      </div>

      {/* Risk Engine Flag Alert */}
      {(Number(codAmount) > 10000000 || Number(goodsValue) > 20000000) && (
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/40 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-300">
          <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 flex-wrap">
              <span>Cảnh Báo Giá Trị Cao (Risk Engine Flag)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/30 uppercase font-mono">
                PENDING_VERIFICATION
              </span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              Đơn hàng có{' '}
              {Number(codAmount) > 10000000
                ? `tiền thu hộ COD vượt 10.000.000 đ (${formatNumberWithDots(codAmount)} đ)`
                : ''}
              {Number(codAmount) > 10000000 && Number(goodsValue) > 20000000 ? ' và ' : ''}
              {Number(goodsValue) > 20000000
                ? `giá trị hàng hóa vượt 20.000.000 đ (${formatNumberWithDots(goodsValue)} đ)`
                : ''}
              . Theo quy chế rủi ro, đơn sẽ được chuyển sang trạng thái{' '}
              <strong>Chờ Xác Minh (PENDING_VERIFICATION)</strong> để Order Manager thẩm định trước khi
              chuyển sang điều phối.
            </p>
          </div>
        </div>
      )}

      {/* AI Quote Breakdown Box */}
      {quoteResult ? (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-xs space-y-2 text-slate-800 dark:text-slate-200 shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-500/20 pb-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Báo Giá Cước Chi Tiết (Chính Thức)
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
              {quoteResult.pickupHub || 'HUB_SG'} → {quoteResult.deliveryHub || 'HUB_DEST'}
            </span>
          </div>

          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Trọng lượng tính cước:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {quoteResult.chargeableWeight} kg
            </span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Cước vận chuyển cơ bản:</span>
            <span className="font-mono">{formatNumberWithDots(quoteResult.baseFee)} đ</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Phí bảo hiểm khai giá:</span>
            <span className="font-mono">{formatNumberWithDots(quoteResult.insuranceFee)} đ</span>
          </div>
          {quoteResult.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
              <span>Mã giảm giá (Voucher):</span>
              <span className="font-mono">-{formatNumberWithDots(quoteResult.discountAmount)} đ</span>
            </div>
          )}
          {quoteResult.discountError && (
            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-1">
              ⚠️ {quoteResult.discountError}
            </div>
          )}

          <div className="flex justify-between items-center font-black text-sm text-slate-900 dark:text-white pt-2 border-t border-emerald-200 dark:border-emerald-500/20">
            <span>Tổng Phí Vận Chuyển:</span>
            <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
              {formatNumberWithDots(quoteResult.shippingFee)} đ
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/30 text-xs space-y-2 text-slate-800 dark:text-slate-200 shadow-xl animate-in fade-in duration-300">
          <div className="flex items-center justify-between font-bold text-cyan-800 dark:text-cyan-400 border-b border-cyan-200 dark:border-cyan-500/20 pb-2">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Báo Giá Cước Tự Động (Tạm Tính)
            </span>
            <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 uppercase">
              TỰ ĐỘNG CẬP NHẬT
            </span>
          </div>

          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Tổng trọng lượng thực:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {(Number(totalActualWeight) || 0).toFixed(1)} kg ({products.length} SP)
            </span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Gói cước &amp; Phương thức:</span>
            <span className="font-semibold text-cyan-700 dark:text-cyan-300">
              {deliveryMode === 'express' ? 'Hỏa Tốc Express (22k)' : 'Cồng Kềnh Bigsize (35k)'} • Mạng Lưới Tuyến Trục Đường Bộ
            </span>
          </div>
          {(isHighValue || Number(goodsValue) > 1000000) && (
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Phí bảo hiểm khai giá (0.5%):</span>
              <span className="font-mono text-sky-600 dark:text-sky-400">
                {formatNumberWithDots(Math.round(Number(goodsValue) * 0.005))} đ
              </span>
            </div>
          )}

          <div className="flex justify-between items-center font-black text-sm text-slate-900 dark:text-white pt-2 border-t border-cyan-200 dark:border-cyan-500/20">
            <span>Tạm Tính Phí Vận Chuyển:</span>
            <span className="font-mono text-base text-cyan-600 dark:text-cyan-400">
              {formatNumberWithDots(estimatedShippingFee)} đ
            </span>
          </div>
        </div>
      )}

      {/* Note & Promo Code */}
      <div className="space-y-3 pt-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Ghi chú giao hàng
          </label>
          <input
            type="text"
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="VD: Cho xem hàng, gọi trước khi giao..."
            className="w-full glass-input rounded-xl px-3.5 py-2.5 min-h-[44px] text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Mã khuyến mãi / Voucher
          </label>
          <input
            type="text"
            value={customOrderCode}
            onChange={(e) => setCustomOrderCode(e.target.value)}
            placeholder="Nhập mã voucher (VD: FREESHIP15)"
            className="w-full glass-input rounded-xl px-3.5 py-2.5 min-h-[44px] text-xs text-cyan-700 dark:text-cyan-400 font-mono uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Grand Total Summary & Payer Logic Box */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-800 dark:text-slate-300 block font-bold text-xs">
              {shippingPayer === 'buyer'
                ? 'Tổng Thu Người Nhận (COD + Ship)'
                : 'Tổng Thu Người Nhận (Chỉ COD)'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Phí ship: {formatNumberWithDots(activeShippingFee)} đ
            </span>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
              {formatNumberWithDots(totalCollectFromBuyer)} đ
            </span>
            <select
              value={shippingPayer}
              onChange={(e) => setShippingPayer(e.target.value as any)}
              className="bg-white dark:bg-slate-800 text-[11px] font-bold text-blue-600 dark:text-blue-400 px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-300 dark:border-slate-700 outline-none cursor-pointer text-left sm:text-right transition hover:border-blue-500"
            >
              <option value="buyer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Khách trả ship
              </option>
              <option value="seller" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Shop trả ship
              </option>
            </select>
          </div>
        </div>

        {/* Dynamic Payer Breakdown Note */}
        {shippingPayer === 'seller' ? (
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 text-[11px] text-purple-900 dark:text-purple-200 flex items-start gap-2.5 animate-in fade-in">
            <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Shop chọn trả cước vận chuyển ({formatNumberWithDots(activeShippingFee)} đ):</span>
              </p>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                • Phí ship sẽ được <strong>trừ trực tiếp vào Tài khoản / Ví Shop</strong> (hoặc trừ khi đối soát COD).<br />
                • Tiền Shop thực nhận từ COD:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatNumberWithDots(netSellerReceive)} đ
                </strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2.5 animate-in fade-in">
            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Khách hàng (Người nhận) trả cước vận chuyển:</span>
              </p>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                • Shipper sẽ thu tổng cộng{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatNumberWithDots(totalCollectFromBuyer)} đ
                </strong>{' '}
                ({formatNumberWithDots(codAmount)}đ COD + {formatNumberWithDots(activeShippingFee)}đ ship) khi giao hàng.<br />
                • Shop sẽ nhận đủ 100% tiền hàng COD:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatNumberWithDots(codAmount)} đ
                </strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
