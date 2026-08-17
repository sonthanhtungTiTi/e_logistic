import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Package,
  MapPin,
  Truck,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Phone,
  User,
  Home,
  CreditCard,
  Plane,
  ShieldCheck,
  Info,
  ChevronRight,
  RotateCcw,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { orderApi } from '../../api/order.api';
import type { CreateOrderPayload, Order, QuoteResponseData } from '../../types/order.types';
import { CompleteShopInfoModal } from '../../components/orders/CompleteShopInfoModal';
import { OrderSuccessModal } from '../../components/orders/OrderSuccessModal';
import { PrintWaybillModal } from '../../components/orders/PrintWaybillModal';
import { OrderSubNav } from '../../components/orders/OrderSubNav';
import { formatNumberWithDots, parseDotsToNumber } from '../../lib/formatters';

interface ProductItem {
  id: number;
  name: string;
  price: number;
  weight: number | string; // kg
  quantity: number | string;
  imageUrl?: string;
}

export const CreateOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Shop Completion Modal state (Tạm thời tắt xác thực thông tin theo yêu cầu)
  const isShopInfoComplete = true; // Boolean(user?.companyName && user?.phoneNumber && user?.address);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Receiver Info
  const [deliverToShop, setDeliverToShop] = useState<boolean>(false);
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [detailAddress, setDetailAddress] = useState<string>('');

  // 4-level Address Grid
  const [province, setProvince] = useState<string>('TP Hồ Chí Minh');
  const [ward, setWard] = useState<string>('Phường 1');
  const [street, setStreet] = useState<string>('Quận 5');
  const [specialAddress, setSpecialAddress] = useState<string>('');

  // Transport & Delivery Options
  const [deliveryMode, setDeliveryMode] = useState<'express' | 'bigsize'>('express');
  const [transportType, setTransportType] = useState<'road' | 'fly'>('road');
  const [pickupTimeSlot, setPickupTimeSlot] = useState<string>('Hẹn lấy');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<string>('Hẹn giao');
  const [pickupType, setPickupType] = useState<'cod' | 'post'>('cod');
  const [warehouseAddress] = useState<string>(
    user?.address || '123 Nguyễn Văn Cừ, Phường 1, Quận 5, TP Hồ Chí Minh'
  );

  // Receiver Info Touched state for inline validation
  const [touchedFields, setTouchedFields] = useState<{
    phone?: boolean;
    name?: boolean;
    address?: boolean;
  }>({});

  const handleFieldBlur = (field: 'phone' | 'name' | 'address') => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  // Product List & Touched state for inline validation
  const [products, setProducts] = useState<ProductItem[]>([
    { id: 1, name: '', price: 0, weight: 0.5, quantity: 1 },
  ]);
  const [touchedProducts, setTouchedProducts] = useState<{
    [id: number]: { name?: boolean; weight?: boolean; quantity?: boolean };
  }>({});

  const handleProductBlur = (id: number, field: 'name' | 'weight' | 'quantity') => {
    setTouchedProducts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: true },
    }));
  };

  // Order Pricing Summary
  const [codAmount, setCodAmount] = useState<number>(0);
  const [goodsValue, setGoodsValue] = useState<number>(0);
  const [shippingPayer, setShippingPayer] = useState<'buyer' | 'seller'>('buyer');
  const [orderNote, setOrderNote] = useState<string>('');
  const [customOrderCode, setCustomOrderCode] = useState<string>('');

  // Solution Services Options
  const [isHighValue, setIsHighValue] = useState<boolean>(false);

  // Submit & Modal States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // 2-Step Order Flow & Quote States (UC-06)
  const [quoteResult, setQuoteResult] = useState<QuoteResponseData | null>(null);
  const [quoting, setQuoting] = useState<boolean>(false);
  const [confirmDiscountModal, setConfirmDiscountModal] = useState<string | null>(null);

  // Key for localStorage auto-drafting
  const DRAFT_KEY = 'elogistic_create_order_draft';
  const [hasDraftRestored, setHasDraftRestored] = useState<boolean>(false);

  // 1. Restore draft from localStorage on initial load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.receiverPhone) setReceiverPhone(draft.receiverPhone);
        if (draft.receiverName) setReceiverName(draft.receiverName);
        if (draft.detailAddress) setDetailAddress(draft.detailAddress);
        if (draft.province) setProvince(draft.province);
        if (draft.ward) setWard(draft.ward);
        if (draft.street) setStreet(draft.street);
        if (draft.specialAddress) setSpecialAddress(draft.specialAddress);
        if (draft.deliveryMode) setDeliveryMode(draft.deliveryMode);
        if (draft.transportType) setTransportType(draft.transportType);
        if (draft.products && Array.isArray(draft.products) && draft.products.length > 0) {
          setProducts(draft.products);
        }
        if (draft.codAmount !== undefined) setCodAmount(draft.codAmount);
        if (draft.goodsValue !== undefined) setGoodsValue(draft.goodsValue);
        if (draft.shippingPayer) setShippingPayer(draft.shippingPayer);
        if (draft.orderNote) setOrderNote(draft.orderNote);
        if (draft.customOrderCode) setCustomOrderCode(draft.customOrderCode);
        if (draft.isHighValue !== undefined) setIsHighValue(draft.isHighValue);

        setHasDraftRestored(true);
      }
    } catch (err) {
      console.error('Failed to parse order draft from localStorage', err);
    }
  }, []);

  // 2. Auto-save draft when form values change
  useEffect(() => {
    const hasMeaningfulData =
      receiverPhone.trim() ||
      receiverName.trim() ||
      detailAddress.trim() ||
      products.some((p) => p.name.trim().length > 0) ||
      Number(codAmount) > 0 ||
      Number(goodsValue) > 0 ||
      orderNote.trim();

    if (hasMeaningfulData) {
      const draftData = {
        receiverPhone,
        receiverName,
        detailAddress,
        province,
        ward,
        street,
        specialAddress,
        deliveryMode,
        transportType,
        products,
        codAmount,
        goodsValue,
        shippingPayer,
        orderNote,
        customOrderCode,
        isHighValue,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }
  }, [
    receiverPhone,
    receiverName,
    detailAddress,
    province,
    ward,
    street,
    specialAddress,
    deliveryMode,
    transportType,
    products,
    codAmount,
    goodsValue,
    shippingPayer,
    orderNote,
    customOrderCode,
    isHighValue,
  ]);

  // 3. Clear draft function
  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setReceiverPhone('');
    setReceiverName('');
    setDetailAddress('');
    setProvince('TP Hồ Chí Minh');
    setWard('Phường 1');
    setStreet('Quận 5');
    setSpecialAddress('');
    setDeliveryMode('express');
    setTransportType('road');
    setProducts([{ id: 1, name: '', price: 0, weight: 0.5, quantity: 1 }]);
    setCodAmount(0);
    setGoodsValue(0);
    setShippingPayer('buyer');
    setOrderNote('');
    setCustomOrderCode('');
    setIsHighValue(false);
    setHasDraftRestored(false);
    setQuoteResult(null);
  };

  // Automatically open modal on load if shop info is incomplete
  useEffect(() => {
    if (!isShopInfoComplete) {
      setShowInfoModal(true);
    }
  }, [isShopInfoComplete]);

  // Product Handlers
  const handleAddProduct = () => {
    setProducts([
      ...products,
      { id: Date.now(), name: '', price: 0, weight: 0.5, quantity: 1 },
    ]);
  };

  const handleRemoveProduct = (id: number) => {
    if (products.length <= 1) return;
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleProductChange = (
    id: number,
    field: keyof ProductItem,
    value: string | number
  ) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Calculated totals & dynamic estimated shipping fee
  const totalActualWeight = products.reduce(
    (sum, p) => sum + (Number(p.weight) || 0) * (Number(p.quantity) || 1),
    0
  );

  // Dynamic estimated fee formula (runs automatically whenever options/weight change)
  const estimatedShippingFee = useMemo(() => {
    const weight = Math.max(0.5, totalActualWeight || 0.5);
    let base = 0;

    if (deliveryMode === 'express') {
      base = 22000;
      if (weight > 1) {
        const extraWeight = weight - 1;
        const extraUnits = Math.ceil(extraWeight / 0.5);
        base += extraUnits * 5000;
      }
    } else {
      base = 35000;
      if (weight > 2) {
        const extraWeight = weight - 2;
        const extraUnits = Math.ceil(extraWeight / 1);
        base += extraUnits * 10000;
      }
    }

    if (transportType === 'fly') {
      base += 15000;
    }

    if (isHighValue || (Number(goodsValue) || 0) > 1000000) {
      const insurance = Math.round((Number(goodsValue) || 0) * 0.005);
      base += insurance;
    }

    return base;
  }, [totalActualWeight, deliveryMode, transportType, goodsValue, isHighValue]);

  // Use official API quote fee if present, otherwise fallback to dynamic estimated fee
  const activeShippingFee = quoteResult ? quoteResult.shippingFee : estimatedShippingFee;

  // 1. Total amount shipper collects from buyer at doorstep
  const totalCollectFromBuyer =
    shippingPayer === 'buyer'
      ? Number(codAmount) + activeShippingFee
      : Number(codAmount);

  // 2. Net amount seller receives after deducting shipping fee if seller pays
  const netSellerReceive =
    shippingPayer === 'seller'
      ? Math.max(0, Number(codAmount) - activeShippingFee)
      : Number(codAmount);

  // Background auto-quote effect (runs silently when address info is entered)
  useEffect(() => {
    if (!receiverPhone.trim() || !receiverName.trim() || !detailAddress.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      orderApi
        .getQuote({
          pickupAddress: {
            province: 'TP Hồ Chí Minh',
            district: 'Quận 5',
            ward: 'Phường 1',
            address: user?.address || '123 Nguyễn Văn Cừ',
          },
          deliveryAddress: {
            province: province || 'TP Hồ Chí Minh',
            district: street || 'Quận 1',
            ward: ward || 'Phường 1',
            address: detailAddress,
          },
          items: products.map((p) => ({
            name: p.name || 'Sản phẩm',
            quantity: Number(p.quantity) || 1,
            weight: Number(p.weight) || 0.5,
          })),
          dimensions: { length: 20, width: 15, height: 10 },
          goodsValue: Number(goodsValue) || 0,
          discountCode: customOrderCode || undefined,
        })
        .then((response) => {
          if (response.data?.success) {
            setQuoteResult(response.data.data);
          }
        })
        .catch(() => {
          // Silently retain estimatedShippingFee if API fails
        });
    }, 600);

    return () => clearTimeout(timer);
  }, [
    receiverPhone,
    receiverName,
    detailAddress,
    province,
    ward,
    street,
    products,
    goodsValue,
    customOrderCode,
    user?.address,
  ]);

  // Helper to scroll smoothly and set focus on target element
  const focusAndScroll = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  // Strict form validation helper with auto-focus on first invalid field (Top-to-Bottom, Left-to-Right)
  const validateForm = (): boolean => {
    setSubmitError(null);

    // Mark all receiver fields as touched
    setTouchedFields({ phone: true, name: true, address: true });

    const cleanPhone = receiverPhone.trim().replace(/[^0-9+]/g, '');
    const isPhoneInvalid = !receiverPhone.trim() || !/^(\+?84|0)[0-9]{9,10}$/.test(cleanPhone);
    const isNameInvalid = !receiverName.trim();
    const isAddressInvalid = !detailAddress.trim();

    // 1. Receiver Phone
    if (isPhoneInvalid) {
      setSubmitError('Vui lòng nhập số điện thoại người nhận hợp lệ (VD: 0912345678).');
      focusAndScroll('input-receiver-phone');
      return false;
    }

    // 2. Receiver Name
    if (isNameInvalid) {
      setSubmitError('Vui lòng nhập họ & tên người nhận.');
      focusAndScroll('input-receiver-name');
      return false;
    }

    // 3. Detail Address
    if (isAddressInvalid) {
      setSubmitError('Vui lòng nhập địa chỉ giao hàng chi tiết.');
      focusAndScroll('input-detail-address');
      return false;
    }

    // 4. Products List (Top-to-Bottom, Left-to-Right)
    const updatedTouched: typeof touchedProducts = { ...touchedProducts };
    let firstInvalidFieldId: string | null = null;
    let firstErrorMsg = '';

    for (const p of products) {
      const isProdNameInvalid = !p.name || !p.name.trim();
      const isProdWeightInvalid =
        p.weight === '' || p.weight === undefined || p.weight === null || Number(p.weight) <= 0 || isNaN(Number(p.weight));
      const isProdQuantityInvalid =
        p.quantity === '' || p.quantity === undefined || p.quantity === null || Number(p.quantity) < 1 || isNaN(Number(p.quantity));

      if (isProdNameInvalid || isProdWeightInvalid || isProdQuantityInvalid) {
        updatedTouched[p.id] = {
          name: true,
          weight: true,
          quantity: true,
        };

        if (!firstInvalidFieldId) {
          if (isProdNameInvalid) {
            firstInvalidFieldId = `product-name-${p.id}`;
            firstErrorMsg = 'Vui lòng nhập tên sản phẩm cho tất cả hàng hóa.';
          } else if (isProdWeightInvalid) {
            firstInvalidFieldId = `product-weight-${p.id}`;
            firstErrorMsg = 'Vui lòng nhập trọng lượng hợp lệ (> 0 kg).';
          } else if (isProdQuantityInvalid) {
            firstInvalidFieldId = `product-quantity-${p.id}`;
            firstErrorMsg = 'Vui lòng nhập số lượng tối thiểu là 1.';
          }
        }
      }
    }

    if (firstInvalidFieldId) {
      setTouchedProducts(updatedTouched);
      setSubmitError(firstErrorMsg || 'Vui lòng điền đầy đủ thông tin hàng hóa, trọng lượng (> 0 kg) và số lượng (≥ 1).');
      focusAndScroll(firstInvalidFieldId);
      return false;
    }

    return true;
  };

  // UC-06 Step 1: Handle Get Quote
  const handleGetQuote = async () => {
    if (!validateForm()) return;

    setQuoting(true);
    try {
      const response = await orderApi.getQuote({
        pickupAddress: {
          province: 'TP Hồ Chí Minh',
          district: 'Quận 5',
          ward: 'Phường 1',
          address: user?.address || '123 Nguyễn Văn Cừ',
        },
        deliveryAddress: {
          province: province || 'TP Hồ Chí Minh',
          district: street || 'Quận 1',
          ward: ward || 'Phường 1',
          address: detailAddress,
        },
        items: products.map((p) => ({
          name: p.name.trim() || 'Sản phẩm',
          quantity: Number(p.quantity),
          weight: Number(p.weight),
        })),
        dimensions: { length: 20, width: 15, height: 10 },
        goodsValue: Number(goodsValue) || 0,
        discountCode: customOrderCode || undefined,
      });

      if (response.data?.success) {
        setQuoteResult(response.data.data);
      }
    } catch (err: any) {
      const resMsg =
        err.response?.data?.message || err.message || 'Không thể lấy báo giá cước phí.';
      setSubmitError(resMsg);
    } finally {
      setQuoting(false);
    }
  };

  // UC-06 Step 2: Submit Order Form
  const handleSubmitOrder = async (confirmWithoutDiscount: boolean = false) => {
    // Guard: Shop profile check
    if (!isShopInfoComplete) {
      setShowInfoModal(true);
      return;
    }

    // Guard: Form validation
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const rawPickupPhone = (user?.phoneNumber || '0912345678').trim().replace(/[^0-9+]/g, '');
      const validPickupPhone = /^(\+?84|0)[0-9]{9,10}$/.test(rawPickupPhone)
        ? rawPickupPhone
        : '0912345678';

      const cleanReceiverPhone = receiverPhone.trim().replace(/[^0-9+]/g, '');

      const payload: CreateOrderPayload = {
        confirmProceedWithoutDiscount: confirmWithoutDiscount,
        pickupAddress: {
          fullName: user?.fullName || 'Shop An Bình',
          phone: validPickupPhone,
          address: user?.address || '123 Nguyễn Văn Cừ',
          ward: 'Phường 1',
          district: 'Quận 5',
          province: 'TP Hồ Chí Minh',
        },
        deliveryAddress: {
          fullName: receiverName,
          phone: cleanReceiverPhone,
          address: detailAddress,
          ward: ward || 'Phường 1',
          district: street || 'Quận 1',
          province: province || 'TP Hồ Chí Minh',
        },
        items: products.map((p) => ({
          name: p.name || 'Sản phẩm',
          quantity: Number(p.quantity) || 1,
          weight: Number(p.weight) || 0.5,
        })),
        dimensions: { length: 20, width: 15, height: 10 },
        actualWeight: totalActualWeight || 0.5,
        isCod: Number(codAmount) > 0,
        codAmount: Number(codAmount) || 0,
        goodsValue: Number(goodsValue) || 0,
        deliveryNote: orderNote,
        discountCode: customOrderCode || undefined,
      };

      const response = await orderApi.createOrder(payload);
      if (response.data?.success) {
        setCreatedOrder(response.data.data);
      } else {
        // Demo fallback
        setCreatedOrder({
          _id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          trackingCode: response.data?.trackingCode || 'ELG-' + Math.floor(10000000 + Math.random() * 90000000),
          trackingNumber: 'ELG-' + Math.floor(10000000 + Math.random() * 90000000),
          pickupAddress: payload.pickupAddress,
          deliveryAddress: payload.deliveryAddress,
          items: payload.items,
          dimensions: payload.dimensions || { length: 20, width: 15, height: 10 },
          actualWeight: totalActualWeight || 0.5,
          volumetricWeight: 0.6,
          chargeableWeight: totalActualWeight || 0.5,
          isCod: Boolean(payload.isCod),
          codAmount: Number(codAmount) || 0,
          goodsValue: Number(goodsValue) || 0,
          baseFee: activeShippingFee,
          insuranceFee: 0,
          discountAmount: 0,
          shippingFee: activeShippingFee,
          status: 'CREATED',
          flagFeeWarning: false,
          flagCodAnomaly: false,
          needsManualRouting: false,
          sellerId: user?._id || 'seller_default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Order);
      }

      // Clear local storage draft after successful order creation
      localStorage.removeItem(DRAFT_KEY);
      setHasDraftRestored(false);
    } catch (err: any) {
      const resData = err.response?.data;
      if (resData?.code === 'DISCOUNT_INVALID_NEEDS_CONFIRM') {
        setConfirmDiscountModal(resData.message);
        return;
      }
      const resMsg = resData?.message || err.message || 'Không thể khởi tạo đơn hàng.';
      setSubmitError(resMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="cursor-pointer hover:text-blue-400" onClick={() => navigate('/seller/dashboard')}>
              Seller Dashboard
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-blue-400 font-semibold">Tạo Đơn Hàng</span>
          </div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 text-blue-400" /> Tạo Đơn Vận Chuyển Mới
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tạo đơn lẻ, tự động tính cước thể tích DIM & xem báo giá AI trực tiếp trước khi khởi tạo
          </p>
        </div>

        {/* Quick Action Tabs */}
        <OrderSubNav activeTab="single" />
      </div>

      {/* Auto-Restored Draft Notification Banner */}
      {hasDraftRestored && (
        <div className="p-4 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-between shadow-xl gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <RotateCcw className="w-4 h-4 animate-spin-once" />
            </div>
            <div>
              <p className="font-bold text-white">Đã tự động khôi phục dữ liệu nháp!</p>
              <p className="text-[11px] text-cyan-200/80">
                Các thông tin bạn nhập dở trước khi tải lại trang đã được bảo toàn từ localStorage.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-bold text-xs transition cursor-pointer shrink-0"
          >
            Xóa Nháp & Nhập Mới
          </button>
        </div>
      )}

      {/* Global Submit Error Notification */}
      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Main 2-Column Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Thông Tin Người Nhận & Tùy Chọn Vận Chuyển */}
        <div className="space-y-6">
          {/* Card 1: Thông Tin Người Nhận */}
          <div className="glass-panel rounded-3xl border border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">1. Thông Tin Người Nhận</h3>
                  <p className="text-[11px] text-slate-400">Nhập chính xác số điện thoại và địa chỉ giao hàng</p>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-medium hover:text-white transition">
                <input
                  type="checkbox"
                  checked={deliverToShop}
                  onChange={(e) => setDeliverToShop(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0 cursor-pointer"
                />
                <span>Giao về shop</span>
              </label>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Phone Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Số điện thoại người nhận <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="input-receiver-phone"
                    type="text"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    onBlur={() => handleFieldBlur('phone')}
                    placeholder="VD: 0912345678"
                    className={`w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 bg-slate-900/90 border outline-none transition ${
                      touchedFields.phone &&
                      (!receiverPhone.trim() ||
                        !/^(\+?84|0)[0-9]{9,10}$/.test(receiverPhone.trim().replace(/[^0-9+]/g, '')))
                        ? 'border-rose-500/80 bg-rose-950/20'
                        : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                </div>
                {touchedFields.phone &&
                  (!receiverPhone.trim() ||
                    !/^(\+?84|0)[0-9]{9,10}$/.test(receiverPhone.trim().replace(/[^0-9+]/g, ''))) && (
                    <p className="text-[10px] text-rose-400 font-medium mt-1 animate-in fade-in duration-200">
                      ⚠️ Vui lòng nhập SĐT người nhận hợp lệ (VD: 0912345678)
                    </p>
                  )}
              </div>

              {/* Name Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Họ & tên người nhận <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="input-receiver-name"
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    onBlur={() => handleFieldBlur('name')}
                    placeholder="VD: Nguyễn Văn A"
                    maxLength={255}
                    className={`w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 bg-slate-900/90 border outline-none transition ${
                      touchedFields.name && !receiverName.trim()
                        ? 'border-rose-500/80 bg-rose-950/20'
                        : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                </div>
                {touchedFields.name && !receiverName.trim() && (
                  <p className="text-[10px] text-rose-400 font-medium mt-1 animate-in fade-in duration-200">
                    ⚠️ Vui lòng nhập họ & tên người nhận
                  </p>
                )}
              </div>

              {/* Detail Address Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Địa chỉ giao hàng chi tiết <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Home className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="input-detail-address"
                    type="text"
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    onBlur={() => handleFieldBlur('address')}
                    placeholder="Số nhà, đường, khu phố..."
                    className={`w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 bg-slate-900/90 border outline-none transition ${
                      touchedFields.address && !detailAddress.trim()
                        ? 'border-rose-500/80 bg-rose-950/20'
                        : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                </div>
                {touchedFields.address && !detailAddress.trim() && (
                  <p className="text-[10px] text-rose-400 font-medium mt-1 animate-in fade-in duration-200">
                    ⚠️ Vui lòng nhập địa chỉ giao hàng chi tiết
                  </p>
                )}
              </div>

              {/* Address 4-Dropdown Grid */}
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> Chọn Tỉnh / Huyện / Xã hành chính
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <select
                    value={specialAddress}
                    onChange={(e) => setSpecialAddress(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-slate-200 bg-slate-900 border border-slate-800 outline-none"
                  >
                    <option value="">Địa chỉ đặc biệt</option>
                    <option value="Chung cư">Chung cư</option>
                    <option value="Tòa nhà văn phòng">Tòa nhà văn phòng</option>
                    <option value="Khu công nghiệp">Khu công nghiệp</option>
                  </select>

                  <select
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-slate-200 bg-slate-900 border border-slate-800 outline-none"
                  >
                    <option value="Đường/Ấp/Khu">Đường/Ấp/Khu</option>
                    <option value="Đường số 1">Đường số 1</option>
                    <option value="Đường Nguyễn Văn Cừ">Đường Nguyễn Văn Cừ</option>
                    <option value="Ấp 1">Ấp 1</option>
                  </select>

                  <select
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-slate-200 bg-slate-900 border border-slate-800 outline-none"
                  >
                    <option value="Xã Long Hòa">Phường/Xã (Xã Long Hòa)</option>
                    <option value="Phường 1">Phường 1</option>
                    <option value="Phường Bến Nghé">Phường Bến Nghé</option>
                    <option value="Phường Tân Định">Phường Tân Định</option>
                  </select>

                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-slate-200 bg-slate-900 border border-slate-800 outline-none"
                  >
                    <option value="TP Hồ Chí Minh">TP Hồ Chí Minh</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                    <option value="Bình Dương">Bình Dương</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Lấy & Giao Tận Nơi & Hình Thức Lấy */}
          <div className="glass-panel rounded-3xl border border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">2. Phương Thức Vận Chuyển & Lấy Hàng</h3>
                <p className="text-[11px] text-slate-400">Lựa chọn gói giao hàng và kho gửi hàng</p>
              </div>
            </div>

            {/* Express vs Bigsize Radio */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryMode('express')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
                  deliveryMode === 'express'
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Truck className={`w-5 h-5 ${deliveryMode === 'express' ? 'text-blue-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-xs">EXPRESS Tiêu Chuẩn</div>
                  <div className="text-[10px] opacity-75">Hàng nhẹ &lt; 20kg</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMode('bigsize')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
                  deliveryMode === 'bigsize'
                    ? 'bg-cyan-600/15 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Package className={`w-5 h-5 ${deliveryMode === 'bigsize' ? 'text-cyan-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-xs">BBS Hàng Lớn</div>
                  <div className="text-[10px] opacity-75">Cồng kềnh ≥ 20kg</div>
                </div>
              </button>
            </div>

            {/* Transport Mode & Time Slots */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="transportType"
                    checked={transportType === 'road'}
                    onChange={() => setTransportType('road')}
                    className="text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <Truck className="w-4 h-4 text-blue-400" />
                  <span>Đường BỘ</span>
                </label>

                <div className="flex items-center gap-2">
                  <select
                    value={pickupTimeSlot}
                    onChange={(e) => setPickupTimeSlot(e.target.value)}
                    className="glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-200 bg-slate-900 border border-slate-800 outline-none"
                  >
                    <option value="Hẹn lấy">Hẹn lấy</option>
                    <option value="Sáng nay (08h - 12h)">Sáng nay (08h - 12h)</option>
                    <option value="Chiều nay (13h - 17h)">Chiều nay (13h - 17h)</option>
                  </select>

                  <select
                    value={deliveryTimeSlot}
                    onChange={(e) => setDeliveryTimeSlot(e.target.value)}
                    className="glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-200 bg-slate-900 border border-slate-800 outline-none"
                  >
                    <option value="Hẹn giao">Hẹn giao</option>
                    <option value="Giờ hành chính">Giờ hành chính</option>
                    <option value="Buổi tối (18h - 21h)">Buổi tối (18h - 21h)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="transportType"
                    checked={transportType === 'fly'}
                    onChange={() => setTransportType('fly')}
                    className="text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <Plane className="w-4 h-4 text-cyan-400" />
                  <span>Đường BAY Hỏa Tốc</span>
                </label>

                <div className="flex items-center gap-2">
                  <select className="glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 outline-none">
                    <option value="Hẹn lấy">Hẹn lấy</option>
                  </select>
                  <select className="glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 outline-none">
                    <option value="Hẹn giao">Hẹn giao</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Warehouse / Post Office Option */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-300">Hình thức gửi/lấy hàng</label>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                    <input
                      type="radio"
                      name="pickupType"
                      checked={pickupType === 'cod'}
                      onChange={() => setPickupType('cod')}
                      className="text-blue-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Lấy hàng tận nơi (Kho Shop)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/seller/profile')}
                    className="text-[11px] font-semibold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Sửa địa chỉ kho
                  </button>
                </div>
                <p className="text-xs text-slate-400 pl-5 font-mono truncate">{warehouseAddress}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="pickupType"
                    checked={pickupType === 'post'}
                    onChange={() => setPickupType('post')}
                    className="text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Gửi hàng tại Bưu cục gần nhất</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sản Phẩm, Cước Phí, Báo Giá & Dịch Vụ */}
        <div className="space-y-6">
          {/* Card 3: Danh Sách Sản Phẩm */}
          <div className="glass-panel rounded-3xl border border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">3. Hàng Hóa & Sản Phẩm</h3>
                  <p className="text-[11px] text-slate-400">Khai báo danh mục sản phẩm và trọng lượng</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddProduct}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm hàng hóa
              </button>
            </div>

            {/* Products List */}
            <div className="space-y-3">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">SP #{index + 1}</span>
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(product.id)}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer transition"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Tên sản phẩm <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id={`product-name-${product.id}`}
                        type="text"
                        value={product.name}
                        onChange={(e) => handleProductChange(product.id, 'name', e.target.value)}
                        onBlur={() => handleProductBlur(product.id, 'name')}
                        placeholder="Nhập tên sản phẩm..."
                        className={`w-full glass-input rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 bg-slate-950 border outline-none transition ${
                          touchedProducts[product.id]?.name && !product.name.trim()
                            ? 'border-rose-500/80 bg-rose-950/20'
                            : 'border-slate-800'
                        }`}
                      />
                      {touchedProducts[product.id]?.name && !product.name.trim() && (
                        <p className="text-[10px] text-rose-400 font-medium mt-1 animate-in fade-in duration-200">
                          ⚠️ Vui lòng nhập tên sản phẩm
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Giá bán (VNĐ)</label>
                      <input
                        type="text"
                        value={formatNumberWithDots(product.price)}
                        onChange={(e) =>
                          handleProductChange(product.id, 'price', parseDotsToNumber(e.target.value))
                        }
                        placeholder="0"
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 bg-slate-950 border border-slate-800 outline-none text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Trọng lượng (kg)</label>
                      <input
                        id={`product-weight-${product.id}`}
                        type="text"
                        inputMode="decimal"
                        value={product.weight === undefined || product.weight === null ? '' : product.weight}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            handleProductChange(product.id, 'weight', val);
                          }
                        }}
                        onBlur={() => handleProductBlur(product.id, 'weight')}
                        placeholder="VD: 0.5"
                        className={`w-full glass-input rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 bg-slate-950 border outline-none transition ${
                          touchedProducts[product.id]?.weight &&
                          (product.weight === '' || Number(product.weight) <= 0 || isNaN(Number(product.weight)))
                            ? 'border-rose-500/80 bg-rose-950/20'
                            : 'border-slate-800'
                        }`}
                      />
                      {touchedProducts[product.id]?.weight &&
                        (product.weight === '' || Number(product.weight) <= 0 || isNaN(Number(product.weight))) && (
                          <p className="text-[10px] text-rose-400 font-medium mt-1 animate-in fade-in duration-200">
                            ⚠️ Cần nhập trọng lượng &gt; 0 kg
                          </p>
                        )}
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Số lượng</label>
                      <input
                        id={`product-quantity-${product.id}`}
                        type="text"
                        inputMode="numeric"
                        value={product.quantity === undefined || product.quantity === null ? '' : product.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*$/.test(val)) {
                            handleProductChange(product.id, 'quantity', val);
                          }
                        }}
                        onBlur={() => handleProductBlur(product.id, 'quantity')}
                        placeholder="VD: 1"
                        className={`w-full glass-input rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 bg-slate-950 border outline-none transition ${
                          touchedProducts[product.id]?.quantity &&
                          (product.quantity === '' || Number(product.quantity) < 1 || isNaN(Number(product.quantity)))
                            ? 'border-rose-500/80 bg-rose-950/20'
                            : 'border-slate-800'
                        }`}
                      />
                      {touchedProducts[product.id]?.quantity &&
                        (product.quantity === '' || Number(product.quantity) < 1 || isNaN(Number(product.quantity))) && (
                          <p className="text-[10px] text-rose-400 font-medium mt-1 animate-in fade-in duration-200">
                            ⚠️ Cần nhập số lượng tối thiểu là 1
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Tổng Cước Phí & Báo Giá AI (Quote Breakdown) */}
          <div className="glass-panel rounded-3xl border border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">4. Tiền Thu Hộ (COD) & Tính Cước</h3>
                <p className="text-[11px] text-slate-400">Báo giá cước vận chuyển và tiền COD thực thu</p>
              </div>
            </div>

            {/* Inputs: COD & Goods Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tiền thu hộ COD (VNĐ)
                </label>
                <input
                  type="text"
                  value={formatNumberWithDots(codAmount)}
                  onChange={(e) => setCodAmount(parseDotsToNumber(e.target.value))}
                  placeholder="0"
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono font-bold bg-slate-900 border border-slate-800 outline-none text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Giá trị hàng hóa (Bảo hiểm)
                </label>
                <input
                  type="text"
                  value={formatNumberWithDots(goodsValue)}
                  onChange={(e) => setGoodsValue(parseDotsToNumber(e.target.value))}
                  placeholder="0"
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold bg-slate-900 border border-slate-800 outline-none text-right"
                />
              </div>
            </div>

            {/* AI Quote Breakdown Box (Always visible: Official or Auto Estimated) */}
            {quoteResult ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-2 text-slate-200 shadow-xl animate-in fade-in duration-300">
                <div className="flex items-center justify-between font-bold text-emerald-400 border-b border-emerald-500/20 pb-2">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Báo Giá Cước Chi Tiết (Chính Thức)
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                    {quoteResult.pickupHub || 'HUB_SG'} → {quoteResult.deliveryHub || 'HUB_DEST'}
                  </span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>Trọng lượng tính cước:</span>
                  <span className="font-mono font-bold text-white">{quoteResult.chargeableWeight} kg</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Cước vận chuyển cơ bản:</span>
                  <span className="font-mono">{formatNumberWithDots(quoteResult.baseFee)} đ</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Phí bảo hiểm khai giá:</span>
                  <span className="font-mono">{formatNumberWithDots(quoteResult.insuranceFee)} đ</span>
                </div>
                {quoteResult.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Mã giảm giá (Voucher):</span>
                    <span className="font-mono">-{formatNumberWithDots(quoteResult.discountAmount)} đ</span>
                  </div>
                )}
                {quoteResult.discountError && (
                  <div className="text-[11px] text-amber-400 font-medium pt-1">
                    ⚠️ {quoteResult.discountError}
                  </div>
                )}

                <div className="flex justify-between items-center font-black text-sm text-white pt-2 border-t border-emerald-500/20">
                  <span>Tổng Phí Vận Chuyển:</span>
                  <span className="font-mono text-base text-emerald-400">
                    {formatNumberWithDots(quoteResult.shippingFee)} đ
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs space-y-2 text-slate-200 shadow-xl animate-in fade-in duration-300">
                <div className="flex items-center justify-between font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cyan-400" /> Báo Giá Cước Tự Động (Tạm Tính)
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 uppercase">
                    TỰ ĐỘNG CẬP NHẬT
                  </span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>Tổng trọng lượng thực:</span>
                  <span className="font-mono font-bold text-white">{(Number(totalActualWeight) || 0).toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Gói cước & Phương thức:</span>
                  <span className="font-semibold text-cyan-300">
                    {deliveryMode === 'express' ? 'Hỏa Tốc Express (22k)' : 'Cồng Kềnh Bigsize (35k)'} • {transportType === 'road' ? 'Đường Bộ' : 'Đường Bay (+15k)'}
                  </span>
                </div>
                {(isHighValue || Number(goodsValue) > 1000000) && (
                  <div className="flex justify-between text-slate-300">
                    <span>Phí bảo hiểm khai giá (0.5%):</span>
                    <span className="font-mono text-amber-400">{formatNumberWithDots(Math.round(Number(goodsValue) * 0.005))} đ</span>
                  </div>
                )}

                <div className="flex justify-between items-center font-black text-sm text-white pt-2 border-t border-cyan-500/20">
                  <span>Tạm Tính Phí Vận Chuyển:</span>
                  <span className="font-mono text-base text-cyan-400">
                    {formatNumberWithDots(estimatedShippingFee)} đ
                  </span>
                </div>
              </div>
            )}

            {/* Note & Promo Code */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ghi chú giao hàng</label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="VD: Cho xem hàng, gọi trước khi giao..."
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-white bg-slate-900 border border-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mã khuyến mãi / Voucher</label>
                <input
                  type="text"
                  value={customOrderCode}
                  onChange={(e) => setCustomOrderCode(e.target.value)}
                  placeholder="Nhập mã voucher (VD: FREESHIP15)"
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-cyan-400 font-mono uppercase bg-slate-900 border border-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Grand Total Summary & Payer Logic Box */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-300 block font-bold text-xs">
                    {shippingPayer === 'buyer' ? 'Tổng Thu Người Nhận (COD + Ship)' : 'Tổng Thu Người Nhận (Chỉ COD)'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Phí ship: {formatNumberWithDots(activeShippingFee)} đ
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400 font-mono block">
                    {formatNumberWithDots(totalCollectFromBuyer)} đ
                  </span>
                  <select
                    value={shippingPayer}
                    onChange={(e) => setShippingPayer(e.target.value as any)}
                    className="bg-slate-800 text-[11px] font-bold text-blue-400 px-2.5 py-1 rounded-lg border border-slate-700 outline-none cursor-pointer text-right transition hover:border-blue-500"
                  >
                    <option value="buyer" className="bg-slate-900 text-white">Khách trả ship</option>
                    <option value="seller" className="bg-slate-900 text-white">Shop trả ship</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Payer Breakdown Note */}
              {shippingPayer === 'seller' ? (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200 flex items-start gap-2.5 animate-in fade-in">
                  <Wallet className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-purple-300">💳 Shop chọn trả cước vận chuyển ({formatNumberWithDots(activeShippingFee)} đ):</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      • Phí ship sẽ được <strong>trừ trực tiếp vào Tài khoản / Ví Shop</strong> (hoặc trừ khi đối soát COD).<br />
                      • Tiền Shop thực nhận từ COD: <strong className="text-emerald-400 font-mono">{formatNumberWithDots(netSellerReceive)} đ</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-200 flex items-start gap-2.5 animate-in fade-in">
                  <Truck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-300">📦 Khách hàng (Người nhận) trả cước vận chuyển:</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      • Shipper sẽ thu tổng cộng <strong className="text-emerald-400 font-mono">{formatNumberWithDots(totalCollectFromBuyer)} đ</strong> ({formatNumberWithDots(codAmount)}đ COD + {formatNumberWithDots(activeShippingFee)}đ ship) khi giao hàng.<br />
                      • Shop sẽ nhận đủ 100% tiền hàng COD: <strong className="text-emerald-400 font-mono">{formatNumberWithDots(codAmount)} đ</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar (Supports UC-06 2-Step Flow) */}
      <div className="sticky bottom-4 z-30 p-4 rounded-3xl glass-panel border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {!isShopInfoComplete ? (
          <div
            onClick={() => setShowInfoModal(true)}
            className="w-full text-rose-400 text-xs sm:text-sm font-bold text-center cursor-pointer hover:underline animate-pulse flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Vui lòng xác thực email và liên kết tài khoản ngân hàng trước khi tạo đơn!</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Tổng trọng lượng: <strong className="text-white font-mono">{(Number(totalActualWeight) || 0).toFixed(1)} kg</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Step 1: Get Quote */}
              <button
                type="button"
                onClick={handleGetQuote}
                disabled={quoting || submitting}
                className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition"
              >
                {quoting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> Đang Tính Cước...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-amber-400" /> Xem Báo Giá Trước
                  </>
                )}
              </button>

              {/* Step 2: Confirm Order */}
              <button
                type="button"
                onClick={() => handleSubmitOrder(false)}
                disabled={submitting || quoting}
                className="flex-1 sm:flex-initial px-7 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 transition"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang Tạo Đơn Hàng...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" /> Xác Nhận Tạo Đơn Hàng
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* DISCOUNT ERROR CONFIRMATION MODAL (Alt Flow 6.2) */}
      {confirmDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-white shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold">Thông báo Mã Khuyến Mãi</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{confirmDiscountModal}</p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDiscountModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscountModal(null);
                  handleSubmitOrder(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Tiếp tục tạo đơn giá gốc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOP VERIFICATION MODAL */}
      <CompleteShopInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        onSuccess={() => {
          setShowInfoModal(false);
        }}
      />

      {/* ORDER SUCCESS MODAL */}
      {createdOrder && (
        <OrderSuccessModal
          order={createdOrder}
          onClose={() => {
            setCreatedOrder(null);
            navigate('/seller/orders');
          }}
          onCreateNext={() => {
            setReceiverPhone('');
            setReceiverName('');
            setDetailAddress('');
            setProducts([{ id: Date.now(), name: '', price: 0, weight: 0.5, quantity: 1 }]);
            setCodAmount(0);
            setGoodsValue(0);
            setOrderNote('');
            setCustomOrderCode('');
            setQuoteResult(null);
            setSubmitError(null);
            setConfirmDiscountModal(null);
            setTouchedFields({});
            setTouchedProducts({});
            localStorage.removeItem(DRAFT_KEY);
            setHasDraftRestored(false);
            setCreatedOrder(null);
            setShowPrintModal(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
              const el = document.getElementById('input-receiver-phone');
              if (el) el.focus();
            }, 150);
          }}
          onViewList={() => {
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
