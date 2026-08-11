import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Package,
  MapPin,
  Truck,
  Plus,
  Trash2,
  BookOpen,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { orderApi } from '../../api/order.api';
import type { CreateOrderPayload, QuoteResponseData, Order } from '../../types/order.types';
import { OrderSuccessModal } from '../../components/orders/OrderSuccessModal';
import { PrintWaybillModal } from '../../components/orders/PrintWaybillModal';
import { VietnamAddressSelector } from '../../components/shared/VietnamAddressSelector';
import type { VietnamAddressData } from '../../components/shared/VietnamAddressSelector';

interface OrderItem {
  name: string;
  quantity: number;
  weight: number; // kg
}

export const CreateOrderPage: React.FC = () => {
  const navigate = useNavigate();

  // Pickup Address state
  const [pickupName, setPickupName] = useState('Công ty Dược An Bình');
  const [pickupPhone, setPickupPhone] = useState('0901234567');
  const [pickupAddressData, setPickupAddressData] = useState<VietnamAddressData>({
    province: 'Thành phố Hồ Chí Minh',
    district: 'Quận 5',
    ward: 'Phường 1',
    address: '123 Nguyễn Văn Cừ',
    note: 'Kho A, tầng trệt',
  });

  // Delivery Address state
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddressData, setDeliveryAddressData] = useState<VietnamAddressData>({
    province: '',
    district: '',
    ward: '',
    address: '',
    note: '',
  });

  // Items State (Dynamic array)
  const [items, setItems] = useState<OrderItem[]>([
    { name: 'Sản phẩm dược phẩm / thiết bị y tế', quantity: 1, weight: 1.0 },
  ]);

  // Package Dimensions (cm)
  const [lengthCm, setLengthCm] = useState<number>(20);
  const [widthCm, setWidthCm] = useState<number>(15);
  const [heightCm, setHeightCm] = useState<number>(10);

  // COD & Goods Value
  const [isCod, setIsCod] = useState<boolean>(true);
  const [codAmount, setCodAmount] = useState<number>(150000);
  const [goodsValue, setGoodsValue] = useState<number>(500000);
  const [deliveryNote] = useState<string>('Giao giờ hành chính, gọi trước khi đến');
  const [discountCode] = useState<string>('');

  // Quote & API states
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<QuoteResponseData | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Dynamic calculated weights
  const actualWeightTotal = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
  const volumetricWeightTotal = (lengthCm * widthCm * heightCm) / 5000;
  const rawChargeable = Math.max(actualWeightTotal, volumetricWeightTotal);
  const chargeableWeightCalculated = Math.ceil(rawChargeable * 2) / 2;

  // Realtime Quote Calculator Effect (Debounced)
  useEffect(() => {
    if (!pickupAddressData.province || !deliveryAddressData.province || items.length === 0) return;

    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const response = await orderApi.getQuote({
          pickupAddress: {
            province: pickupAddressData.province,
            district: pickupAddressData.district,
            ward: pickupAddressData.ward,
          },
          deliveryAddress: {
            province: deliveryAddressData.province,
            district: deliveryAddressData.district,
            ward: deliveryAddressData.ward,
          },
          items: items.map((i) => ({ name: i.name, quantity: i.quantity, weight: i.weight })),
          dimensions: { length: lengthCm, width: widthCm, height: heightCm },
          goodsValue,
          discountCode: discountCode || undefined,
        });

        if (response.data.success) {
          setQuoteData(response.data.data);
        }
      } catch (err: any) {
        console.error('Không thể tính toán cước phí dự kiến:', err);
      } finally {
        setQuoteLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    pickupAddressData.province,
    pickupAddressData.district,
    pickupAddressData.ward,
    deliveryAddressData.province,
    deliveryAddressData.district,
    deliveryAddressData.ward,
    items,
    lengthCm,
    widthCm,
    heightCm,
    goodsValue,
    discountCode,
  ]);

  // Item List Handlers
  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1, weight: 0.5 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, val: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Submit Order Form Handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!deliveryName.trim() || !deliveryPhone.trim()) {
      setSubmitError('Vui lòng điền đầy đủ tên và số điện thoại người nhận.');
      return;
    }

    if (
      !deliveryAddressData.province ||
      !deliveryAddressData.district ||
      !deliveryAddressData.ward ||
      !deliveryAddressData.address
    ) {
      setSubmitError('Vui lòng chọn Tỉnh/TP, Quận/Huyện, Phường/Xã và địa chỉ giao hàng.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateOrderPayload = {
        pickupAddress: {
          fullName: pickupName,
          phone: pickupPhone,
          address: pickupAddressData.address,
          ward: pickupAddressData.ward,
          district: pickupAddressData.district,
          province: pickupAddressData.province,
        },
        deliveryAddress: {
          fullName: deliveryName,
          phone: deliveryPhone,
          address: deliveryAddressData.address,
          ward: deliveryAddressData.ward,
          district: deliveryAddressData.district,
          province: deliveryAddressData.province,
        },
        items: items.map((i) => ({
          name: i.name,
          quantity: Number(i.quantity),
          weight: Number(i.weight),
        })),
        dimensions: {
          length: Number(lengthCm),
          width: Number(widthCm),
          height: Number(heightCm),
        },
        isCod,
        codAmount: isCod ? Number(codAmount) : 0,
        goodsValue: Number(goodsValue),
        deliveryNote: deliveryNote || deliveryAddressData.note,
        discountCode: discountCode || undefined,
      };

      const response = await orderApi.createOrder(payload);

      if (response.data.success) {
        setCreatedOrder(response.data.data);
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Tạo đơn hàng thất bại. Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase mb-1">
            <Package className="w-3.5 h-3.5" /> Quản Lý Đơn Vận Chuyển
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Tạo Đơn Hàng Mới</h1>
          <p className="text-xs text-slate-400">
            Tự động tra cứu Tỉnh/Thành, Quận/Huyện, Phường/Xã Việt Nam & tính cước quy đổi chính xác
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/seller/orders')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Quay Lại Danh Sách
          </button>
        </div>
      </div>

      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Cards 1, 2, 3 */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CARD 1: PICKUP ADDRESS */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <MapPin className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">1. Điểm Lấy Hàng (Người Gửi)</h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Tự động từ cài đặt kho
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tên Người Gửi / Cửa Hàng *</label>
                <input
                  type="text"
                  required
                  value={pickupName}
                  onChange={(e) => setPickupName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Số Điện Thoại Người Gửi *</label>
                <input
                  type="text"
                  required
                  value={pickupPhone}
                  onChange={(e) => setPickupPhone(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            {/* Dynamic Vietnam Address Selector for Pickup */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <VietnamAddressSelector
                value={pickupAddressData}
                onChange={setPickupAddressData}
                layout="grid"
                showNoteField={true}
                darkTheme={true}
              />
            </div>
          </div>

          {/* CARD 2: DELIVERY ADDRESS */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Truck className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">2. Điểm Giao Hàng (Người Nhận)</h3>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" /> Danh Bạ Khách Hàng
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Họ Tên Người Nhận *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên người nhận"
                  value={deliveryName}
                  onChange={(e) => setDeliveryName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Số Điện Thoại Người Nhận *</label>
                <input
                  type="text"
                  required
                  placeholder="0987654321"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Dynamic Vietnam Address Selector for Delivery */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <VietnamAddressSelector
                value={deliveryAddressData}
                onChange={setDeliveryAddressData}
                layout="grid"
                showNoteField={true}
                darkTheme={true}
              />
            </div>
          </div>

          {/* CARD 3: PARCEL ITEMS & DIMENSIONS */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Package className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">3. Chi Tiết Hàng Hóa & Quy Cách Kích Thước</h3>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Sản Phẩm
              </button>
            </div>

            {/* Items Table */}
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Tên mặt hàng / SKU"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full glass-input rounded-xl px-2 py-1.5 text-xs font-mono text-center text-white"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={item.weight}
                      onChange={(e) => handleItemChange(idx, 'weight', parseFloat(e.target.value) || 0.1)}
                      className="w-full glass-input rounded-xl px-2 py-1.5 text-xs font-mono text-center text-white"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Package Dimensions */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-300 mb-2">Kích Thước Đóng Gói D x R x C (cm)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <input
                    type="number"
                    value={lengthCm}
                    onChange={(e) => setLengthCm(parseInt(e.target.value) || 1)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-center text-white"
                    placeholder="Dài (cm)"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={widthCm}
                    onChange={(e) => setWidthCm(parseInt(e.target.value) || 1)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-center text-white"
                    placeholder="Rộng (cm)"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(parseInt(e.target.value) || 1)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-center text-white"
                    placeholder="Cao (cm)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Confirmation Summary */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 sticky top-6 shadow-2xl">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" /> Cước Phí & Thu Hộ COD
              </h3>
              {quoteLoading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
            </div>

            {/* Weight Summary */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Tổng TL Thực:</span>
                <span className="font-mono font-bold text-white">{actualWeightTotal.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>TL Quy Đổi (DIM):</span>
                <span className="font-mono text-cyan-400">{volumetricWeightTotal.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold">
                <span className="text-slate-200">TL Tính Cước:</span>
                <span className="font-mono text-emerald-400">{chargeableWeightCalculated.toFixed(1)} kg</span>
              </div>
            </div>

            {/* COD & Goods Value */}
            <div className="space-y-3">
              <label className="flex items-center justify-between text-xs font-bold text-slate-300 cursor-pointer">
                <span>Thu Hộ COD</span>
                <input
                  type="checkbox"
                  checked={isCod}
                  onChange={(e) => setIsCod(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
              </label>

              {isCod && (
                <div className="relative">
                  <input
                    type="number"
                    value={codAmount}
                    onChange={(e) => setCodAmount(parseInt(e.target.value) || 0)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-white text-right pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">đ</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Khai Giá Hàng Hóa (VND)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={goodsValue}
                    onChange={(e) => setGoodsValue(parseInt(e.target.value) || 0)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-white text-right pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">đ</span>
                </div>
              </div>
            </div>

            {/* Dynamic Quote Pricing Result */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Cước Cơ Bản:</span>
                <span className="font-mono text-white">
                  {(quoteData?.baseFee || 22000).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Phí Bảo Hiểm:</span>
                <span className="font-mono text-white">
                  {(quoteData?.insuranceFee || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between text-base font-black pt-3 border-t border-slate-800 text-emerald-400">
                <span>TỔNG CƯỚC TÍNH:</span>
                <span className="font-mono">
                  {(quoteData?.shippingFee || 22000).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl shimmer-btn text-white font-black text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Đang Tạo Đơn...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Xác Nhận Tạo Đơn
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* SUCCESS MODAL */}
      {createdOrder && (
        <OrderSuccessModal
          order={createdOrder}
          onClose={() => {
            setCreatedOrder(null);
            navigate('/seller/orders');
          }}
          onPrintWaybill={() => setShowPrintModal(true)}
        />
      )}

      {/* PRINT WAYBILL MODAL */}
      {showPrintModal && createdOrder && (
        <PrintWaybillModal order={createdOrder} onClose={() => setShowPrintModal(false)} />
      )}
    </div>
  );
};
