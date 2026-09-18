import React from 'react';
import { Package, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ProductItem as CatalogProductItem } from '../../../api/product.api';
import { formatNumberWithDots } from '../../../lib/formatters';
import type { ProductItem, Dimensions, TouchedProducts } from './types';

interface PackageItemsSectionProps {
  products: ProductItem[];
  catalogProducts: CatalogProductItem[];
  totalActualWeight: number;
  dimensions: Dimensions;
  volumetricWeight: number;
  isBulky: boolean;
  isOversized: boolean;
  maxDimension: number;
  touchedProducts: TouchedProducts;
  handleAddProduct: () => void;
  handleRemoveProduct: (id: number) => void;
  handleProductChange: (id: number, field: keyof ProductItem, val: any) => void;
  handleProductBlur: (index: number, field: keyof ProductItem) => void;
  handleSelectCatalogProduct: (productId: string, targetIndex: number) => void;
  handleDimensionChange: (dim: keyof Dimensions, val: string) => void;
}

export const PackageItemsSection: React.FC<PackageItemsSectionProps> = ({
  products,
  catalogProducts,
  totalActualWeight,
  dimensions,
  volumetricWeight,
  isBulky,
  isOversized,
  maxDimension,
  touchedProducts,
  handleAddProduct,
  handleRemoveProduct,
  handleProductChange,
  handleProductBlur,
  handleSelectCatalogProduct,
  handleDimensionChange,
}) => {
  return (
    <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              3. Hàng Hóa &amp; Sản Phẩm
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Khai báo danh mục sản phẩm và trọng lượng
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Tổng: {products.length} SP • {totalActualWeight.toFixed(1)} kg
          </span>
          <button
            type="button"
            onClick={handleAddProduct}
            className="px-3 py-1.5 min-h-[38px] rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm hàng hóa
          </button>
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                  SP #{index + 1}
                </span>
                {catalogProducts.length > 0 && (
                  <select
                    onChange={(e) => handleSelectCatalogProduct(e.target.value, index)}
                    className="text-[11px] bg-white dark:bg-slate-950 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 rounded-lg px-2 py-1 max-w-[230px] focus:outline-none focus:border-emerald-500 cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      📦 Chọn từ sản phẩm mẫu...
                    </option>
                    {catalogProducts.map((cp) => (
                      <option
                        key={cp._id}
                        value={cp._id}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {cp.name} ({cp.weightKg}kg - {formatNumberWithDots(cp.priceVnd)}đ)
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {products.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveProduct(product.id)}
                  className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 p-2 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer transition"
                  title="Xóa sản phẩm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Tên hàng hóa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => handleProductChange(product.id, 'name', e.target.value)}
                  onBlur={() => handleProductBlur(index, 'name')}
                  placeholder="Áo thun, mỹ phẩm, sách..."
                  className={`w-full glass-input rounded-xl px-3 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border outline-none ${
                    touchedProducts[index]?.name && !product.name.trim()
                      ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                      : 'border-slate-200 dark:border-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Trọng lượng (kg) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.05"
                  inputMode="decimal"
                  value={product.weight === 0 ? '' : product.weight}
                  onChange={(e) => handleProductChange(product.id, 'weight', e.target.value)}
                  onBlur={() => handleProductBlur(index, 'weight')}
                  placeholder="0.5"
                  className={`w-full glass-input rounded-xl px-3 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border outline-none ${
                    touchedProducts[index]?.weight && (Number(product.weight) <= 0 || isNaN(Number(product.weight)))
                      ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                      : 'border-slate-200 dark:border-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số lượng
                </label>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={product.quantity === 0 ? '' : product.quantity}
                  onChange={(e) => handleProductChange(product.id, 'quantity', e.target.value)}
                  placeholder="1"
                  className="w-full glass-input rounded-xl px-3 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Package Dimension Inputs */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Kích thước đóng gói bưu kiện (Dài x Rộng x Cao)
          </label>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            TL thể tích quy đổi: <strong className="text-cyan-600 dark:text-cyan-400">{volumetricWeight.toFixed(1)} kg</strong>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Chiều Dài (cm) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={dimensions.length || ''}
              onChange={(e) => handleDimensionChange('length', e.target.value)}
              placeholder="Dài"
              className="w-full glass-input rounded-xl px-3 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-center focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Chiều Rộng (cm) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={dimensions.width || ''}
              onChange={(e) => handleDimensionChange('width', e.target.value)}
              placeholder="Rộng"
              className="w-full glass-input rounded-xl px-3 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-center focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Chiều Cao (cm) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={dimensions.height || ''}
              onChange={(e) => handleDimensionChange('height', e.target.value)}
              placeholder="Cao"
              className="w-full glass-input rounded-xl px-3 py-2 min-h-[44px] text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-center focus:border-blue-500"
            />
          </div>
        </div>

        {/* Bulky Dispatch Warning Alert */}
        {isBulky ? (
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 flex items-start gap-3 text-blue-900 dark:text-blue-200 text-xs animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-blue-900 dark:text-blue-200">
                ⚠️ Kiện hàng cồng kềnh / Vượt chuẩn xe máy
              </p>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {isOversized && (
                  <span>
                    • Kích thước cạnh dài nhất (<strong>{maxDimension} cm</strong>) vượt ngưỡng xe máy (&gt;80 cm).<br />
                  </span>
                )}
                {totalActualWeight > 30 && (
                  <span>
                    • Khối lượng thực tế (<strong>{totalActualWeight.toFixed(1)} kg</strong>) vượt chuẩn xe máy (&gt;30 kg).<br />
                  </span>
                )}
                {volumetricWeight > 30 && (
                  <span>
                    • Thể tích quy đổi (<strong>{volumetricWeight.toFixed(1)} kg</strong>) vượt chuẩn xe máy (&gt;30 kg).<br />
                  </span>
                )}
                👉 Đơn hàng sẽ được chuyển đến <strong>Quản lý Vận hành (Vendor Ops)</strong> để thẩm duyệt và phân bổ phương tiện chuyên dụng.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Hàng tiêu chuẩn xe máy</strong> (≤ 30 kg &amp; cạnh ≤ 80 cm) — Sẵn sàng lấy hàng và điều phối Shipper khu vực sau khi xác nhận tạo đơn.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
