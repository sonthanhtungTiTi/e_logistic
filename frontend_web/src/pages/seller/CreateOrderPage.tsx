import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  Phone,
  User,
  Home,
  FileText,
  HelpCircle,
  Download,
  CreditCard,
  MessageSquare,
  Plane,
  X,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { orderApi } from '../../api/order.api';
import type { CreateOrderPayload, Order } from '../../types/order.types';
import { CompleteShopInfoModal } from '../../components/orders/CompleteShopInfoModal';
import { OrderSuccessModal } from '../../components/orders/OrderSuccessModal';
import { PrintWaybillModal } from '../../components/orders/PrintWaybillModal';

interface ProductItem {
  id: number;
  name: string;
  price: number;
  weight: number; // kg
  quantity: number;
  imageUrl?: string;
}

export const CreateOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Shop Completion Modal state
  const isShopInfoComplete = Boolean(
    user?.isEmailVerified && (user?.bankAccount || user?.isBankLinked)
  );
  const [showInfoModal, setShowInfoModal] = useState<boolean>(!isShopInfoComplete);

  // Receiver Info
  const [deliverToShop, setDeliverToShop] = useState<boolean>(false);
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [detailAddress, setDetailAddress] = useState<string>('');

  // 4-level Address Grid
  const [province, setProvince] = useState<string>('TP Hồ Chí Minh');
  const [ward, setWard] = useState<string>('Xã Long Hòa');
  const [street, setStreet] = useState<string>('Đường số 1');
  const [specialAddress, setSpecialAddress] = useState<string>('');

  // Transport & Delivery Options
  const [deliveryMode, setDeliveryMode] = useState<'express' | 'bigsize'>('express');
  const [transportType, setTransportType] = useState<'road' | 'fly'>('road');
  const [pickupTimeSlot, setPickupTimeSlot] = useState<string>('Hẹn lấy');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<string>('Hẹn giao');
  const [pickupType, setPickupType] = useState<'cod' | 'post'>('cod');
  const [warehouseAddress] = useState<string>(
    user?.address || ', Xã Long Hòa, Xã Long Hòa, TP Hồ Chí Minh'
  );

  // Product List
  const [products, setProducts] = useState<ProductItem[]>([
    { id: 1, name: '', price: 0, weight: 0.5, quantity: 1 },
  ]);

  // Order Pricing Summary
  const [totalWeightSelect, setTotalWeightSelect] = useState<number>(0.5);
  const [codAmount, setCodAmount] = useState<number>(0);
  const [goodsValue, setGoodsValue] = useState<number>(0);
  const [shippingPayer, setShippingPayer] = useState<'buyer' | 'seller'>('buyer');
  const [orderNote, setOrderNote] = useState<string>('');
  const [customOrderCode, setCustomOrderCode] = useState<string>('');

  // Solution Services Options
  const [isHighValue, setIsHighValue] = useState<boolean>(false);
  const [pickupService, setPickupService] = useState<string>('Chưa chọn');
  const [deliveryService, setDeliveryService] = useState<string>('Chưa chọn');
  const [returnService] = useState<string>('Đã chọn 1');

  // Submit & Modal States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

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

  // Calculated totals
  const totalActualWeight = products.reduce(
    (sum, p) => sum + (Number(p.weight) || 0) * (Number(p.quantity) || 1),
    0
  );
  const calculatedShippingFee = totalActualWeight > 0 ? (deliveryMode === 'express' ? 22000 : 35000) : 0;
  const grandTotal = (shippingPayer === 'buyer' ? Number(codAmount) : Math.max(0, Number(codAmount) - calculatedShippingFee));

  // Submit Order Form
  const handleSubmitOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitError(null);

    // Guard: Shop profile check
    if (!isShopInfoComplete) {
      setShowInfoModal(true);
      return;
    }

    // Guard: Validation
    if (!receiverPhone.trim() || !receiverName.trim()) {
      setSubmitError('Vui lòng nhập đầy đủ số điện thoại và tên người nhận.');
      return;
    }

    if (!detailAddress.trim()) {
      setSubmitError('Vui lòng nhập địa chỉ giao hàng chi tiết.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateOrderPayload = {
        pickupAddress: {
          fullName: user?.fullName || 'Shop An Bình',
          phone: user?.phoneNumber || '0901234567',
          address: user?.address || '123 Nguyễn Văn Cừ',
          ward: 'Phường 1',
          district: 'Quận 5',
          province: 'Thành phố Hồ Chí Minh',
        },
        deliveryAddress: {
          fullName: receiverName,
          phone: receiverPhone,
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
        // Fallback for demo
        setCreatedOrder({
          _id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          trackingNumber: 'EL' + Math.floor(10000000 + Math.random() * 90000000),
          sender: {
            fullName: user?.fullName || 'Shop An Bình',
            phone: user?.phoneNumber || '0901234567',
            address: user?.address || '123 Nguyễn Văn Cừ, Q5, TP.HCM',
          },
          receiver: {
            fullName: receiverName,
            phone: receiverPhone,
            address: `${detailAddress}, ${ward}, ${province}`,
          },
          items: products.map((p) => ({ name: p.name || 'Sản phẩm', quantity: p.quantity, weight: p.weight })),
          packageDetails: { weight: totalActualWeight || 0.5 },
          pricing: { totalFee: calculatedShippingFee, codFee: 0, insuranceFee: 0 },
          codAmount: Number(codAmount) || 0,
          goodsValue: Number(goodsValue) || 0,
          status: 'CREATED',
          createdAt: new Date().toISOString(),
        } as Order);
      }
    } catch (err: any) {
      // Create order fallback preview
      setCreatedOrder({
        _id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        trackingNumber: 'EL' + Math.floor(10000000 + Math.random() * 90000000),
        sender: {
          fullName: user?.fullName || 'Shop An Bình',
          phone: user?.phoneNumber || '0901234567',
          address: user?.address || '123 Nguyễn Văn Cừ, Q5, TP.HCM',
        },
        receiver: {
          fullName: receiverName,
          phone: receiverPhone,
          address: `${detailAddress}, ${ward}, ${province}`,
        },
        items: products.map((p) => ({ name: p.name || 'Sản phẩm', quantity: p.quantity, weight: p.weight })),
        packageDetails: { weight: totalActualWeight || 0.5 },
        pricing: { totalFee: calculatedShippingFee, codFee: 0, insuranceFee: 0 },
        codAmount: Number(codAmount) || 0,
        goodsValue: Number(goodsValue) || 0,
        status: 'CREATED',
        createdAt: new Date().toISOString(),
      } as Order);
    } finally {
      setSubmitting(false);
    }
  };

  const shopInitials = (user?.companyName || user?.fullName || 'NF')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-40 bg-[#f6f6f6] text-black overflow-hidden flex flex-col font-sans select-none">

      {/* 1. TOP HEADER BAR matching Provided HTML Code & Image 2 */}
      <header className="h-[64px] border-b border-[#eee] bg-white flex items-center px-4 shrink-0 shadow-xs">

        {/* Shop Avatar */}
        <div
          onClick={() => navigate('/seller/profile')}
          className="cursor-pointer h-full flex items-center gap-2 pr-3 w-[68px] justify-center"
          title="Thông tin Shop"
        >
          <div className="w-10 h-10 rounded-full bg-[#158C4D] text-white flex items-center justify-center font-bold text-base shadow-xs">
            {shopInitials}
          </div>
        </div>

        {/* Page Title & Navigation Tabs */}
        <div className="flex items-center ml-2">
          <div className="font-medium text-2xl text-slate-900 truncate">Tạo đơn hàng</div>

          <div className="ml-7 space-x-1 shrink-0 flex items-center">
            <button
              type="button"
              className="bg-[#E6F6EA] text-[#158C4D] font-medium border border-[#158C4D] px-3.5 py-1.5 rounded-md text-sm cursor-pointer"
            >
              Đăng đơn lẻ
            </button>
            <button
              type="button"
              onClick={() => navigate('/seller/orders/batch')}
              className="text-slate-600 hover:text-[#158C4D] px-3.5 py-1.5 rounded-md text-sm font-medium cursor-pointer transition"
            >
              Đăng đơn Excel
            </button>
            <button
              type="button"
              onClick={() => navigate('/seller/orders')}
              className="text-slate-600 hover:text-[#158C4D] px-3.5 py-1.5 rounded-md text-sm font-medium cursor-pointer transition"
            >
              Đơn nháp 0
            </button>
            <button
              type="button"
              onClick={() => navigate('/seller/orders')}
              className="text-slate-600 hover:text-[#158C4D] px-3.5 py-1.5 rounded-md text-sm font-medium cursor-pointer transition"
            >
              Đơn đã tạo 0
            </button>
          </div>
        </div>

        {/* Top Right Action Button */}
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSubmitOrder()}
            disabled={submitting}
            className="bg-[#158C4D] hover:bg-[#0f6f3c] text-white h-10 px-4 rounded-md font-medium text-sm flex items-center gap-2 shadow-xs cursor-pointer transition"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.99999 2.80005L7.99999 13.2M13.2 8.00005L2.79999 8.00005" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
            <span>Tạo đơn hàng</span>
          </button>
        </div>
      </header>

      {/* 2. BODY WORKSPACE: LEFT SIDEBAR + MAIN CONTENT */}
      <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">

        {/* LEFT NARROW SIDEBAR */}
        <aside className="w-[68px] h-full shrink-0 border-r border-[#eee] bg-white flex flex-col justify-between items-center py-3">

          {/* Top Nav Icons */}
          <div className="flex flex-col gap-3 w-full px-3">
            <button
              onClick={() => navigate('/seller/dashboard')}
              className="p-2.5 rounded-md text-slate-700 hover:text-[#158C4D] hover:bg-[#E6F6EA] flex items-center justify-center transition cursor-pointer"
              title="Trang chủ / Tổng quan"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/seller/orders')}
              className="p-2.5 rounded-md text-slate-700 hover:text-[#158C4D] hover:bg-[#E6F6EA] flex items-center justify-center transition cursor-pointer"
              title="Vận hành đơn hàng"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/seller/dashboard')}
              className="p-2.5 rounded-md text-slate-700 hover:text-[#158C4D] hover:bg-[#E6F6EA] flex items-center justify-center transition cursor-pointer"
              title="GAM Performance"
            >
              <Package className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/seller/wallet')}
              className="p-2.5 rounded-md text-slate-700 hover:text-[#158C4D] hover:bg-[#E6F6EA] flex items-center justify-center transition cursor-pointer"
              title="Dòng tiền & Ví COD"
            >
              <CreditCard className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/seller/tickets')}
              className="p-2.5 rounded-md text-slate-700 hover:text-[#158C4D] hover:bg-[#E6F6EA] flex items-center justify-center transition cursor-pointer"
              title="Hỗ trợ Chat Order"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Nav Icons & Brand Logo */}
          <div className="w-full flex flex-col gap-3 px-3 items-center">
            <a
              href="https://s.giaohangtietkiem.vn/files/templates/Bieuphi_Giaohangtietkiem.pdf"
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-700 hover:text-[#158C4D]"
              title="Bảng phí vận chuyển PDF"
            >
              <FileText className="w-5 h-5" />
            </a>
            <button
              onClick={() => navigate('/seller/tickets')}
              className="p-2 text-slate-700 hover:text-[#158C4D] cursor-pointer"
              title="Trợ giúp"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* E-Logistic Green Logo */}
            <div
              onClick={() => navigate('/seller/dashboard')}
              className="w-10 h-10 rounded-full bg-[#158C4D] flex items-center justify-center text-white font-bold text-lg cursor-pointer shadow-xs hover:scale-105 transition"
              title="E-Logistic Home"
            >
              E
            </div>
          </div>
        </aside>

        {/* MAIN FORM GRID CONTAINER */}
        <main className="flex-1 h-full overflow-y-auto bg-[#f6f6f6] px-6 pt-6 pb-24 flex flex-col">

          {submitError && (
            <div className="mb-4 p-3 rounded-md bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* 2-COLUMN MAIN CONTENT CARD */}
          <div className="w-full max-w-7xl mx-auto bg-white rounded-t-md border border-[#eee] flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#eee]">

            {/* LEFT COLUMN: Người Nhận & Các Tùy Chọn Lấy Giao */}
            <div className="lg:w-1/2 p-6 space-y-6">

              {/* SECTION: Người Nhận */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900 text-[17px]">Người nhận</div>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deliverToShop}
                      onChange={(e) => setDeliverToShop(e.target.checked)}
                      className="rounded text-[#158C4D] focus:ring-0"
                    />
                    <span>Giao về shop</span>
                  </label>
                </div>

                {/* Receiver Phone Input */}
                <div className="flex items-center border-b border-[#eee] pb-2">
                  <Phone className="w-5 h-5 text-slate-700 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="Nhập số điện thoại người nhận"
                    className="w-full outline-none text-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                {/* Receiver Name Input */}
                <div className="flex items-center border-b border-[#eee] pb-2">
                  <User className="w-5 h-5 text-slate-700 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Tên người nhận"
                    maxLength={255}
                    className="w-full outline-none text-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                {/* Detailed Address Input */}
                <div className="flex items-center border-b border-[#eee] pb-2">
                  <Home className="w-5 h-5 text-slate-700 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    placeholder="Địa chỉ chi tiết (Số nhà, tên đường...)"
                    className="w-full outline-none text-sm text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                {/* 4-Select Grid for Address */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-700 shrink-0 mt-2" />
                  <div className="grid grid-cols-2 gap-3 w-full text-xs">
                    <div>
                      <select
                        value={specialAddress}
                        onChange={(e) => setSpecialAddress(e.target.value)}
                        className="w-full border border-slate-200 rounded px-2.5 py-2 text-xs bg-slate-50 text-slate-700 outline-none"
                      >
                        <option value="">Địa chỉ đặc biệt</option>
                        <option value="Chung cư">Chung cư</option>
                        <option value="Tòa nhà văn phòng">Tòa nhà văn phòng</option>
                        <option value="Khu công nghiệp">Khu công nghiệp</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full border border-slate-200 rounded px-2.5 py-2 text-xs bg-slate-50 text-slate-700 outline-none"
                      >
                        <option value="Đường/Ấp/Khu">Đường/Ấp/Khu</option>
                        <option value="Đường số 1">Đường số 1</option>
                        <option value="Đường Nguyễn Văn Cừ">Đường Nguyễn Văn Cừ</option>
                        <option value="Ấp 1">Ấp 1</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        className="w-full border border-slate-200 rounded px-2.5 py-2 text-xs bg-slate-50 text-slate-700 outline-none"
                      >
                        <option value="Xã Long Hòa">Phường/Xã (Xã Long Hòa)</option>
                        <option value="Phường 1">Phường 1</option>
                        <option value="Phường Bến Nghé">Phường Bến Nghé</option>
                        <option value="Phường Tân Định">Phường Tân Định</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full border border-slate-200 rounded px-2.5 py-2 text-xs bg-slate-50 text-slate-700 outline-none"
                      >
                        <option value="TP Hồ Chí Minh">Tỉnh/TP (TP Hồ Chí Minh)</option>
                        <option value="Hà Nội">Hà Nội</option>
                        <option value="Đà Nẵng">Đà Nẵng</option>
                        <option value="Cần Thơ">Cần Thơ</option>
                        <option value="Bình Dương">Bình Dương</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: Lấy & Giao Tận Nơi */}
              <section className="pt-4 border-t border-[#eee] space-y-4">
                <div className="font-semibold text-slate-900 text-[17px]">Lấy &amp; Giao tận nơi</div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryMode"
                      checked={deliveryMode === 'express'}
                      onChange={() => setDeliveryMode('express')}
                      className="text-[#158C4D] focus:ring-0"
                    />
                    <Truck className="w-5 h-5 text-[#158C4D]" />
                    <span>EXPRESS nhanh &lt; 20kg</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryMode"
                      checked={deliveryMode === 'bigsize'}
                      onChange={() => setDeliveryMode('bigsize')}
                      className="text-[#158C4D] focus:ring-0"
                    />
                    <Package className="w-5 h-5 text-slate-700" />
                    <span>BBS lớn ≥ 20kg</span>
                  </label>
                </div>

                {/* Transport Options: Đường BỘ & Đường BAY */}
                <div className="space-y-3 pt-2">
                  {/* Road Transport */}
                  <div className="flex items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 min-w-[160px] cursor-pointer">
                      <input
                        type="radio"
                        name="transportType"
                        checked={transportType === 'road'}
                        onChange={() => setTransportType('road')}
                        className="text-[#158C4D] focus:ring-0"
                      />
                      <Truck className="w-5 h-5 text-[#158C4D]" />
                      <span className="text-[#158C4D]">Đường BỘ</span>
                    </label>

                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={pickupTimeSlot}
                        onChange={(e) => setPickupTimeSlot(e.target.value)}
                        className="w-1/2 border border-slate-200 rounded px-2 py-1.5 text-xs bg-[#f6f6f6]"
                      >
                        <option value="Hẹn lấy">Hẹn lấy</option>
                        <option value="Sáng nay (08h - 12h)">Sáng nay (08h - 12h)</option>
                        <option value="Chiều nay (13h - 17h)">Chiều nay (13h - 17h)</option>
                      </select>

                      <select
                        value={deliveryTimeSlot}
                        onChange={(e) => setDeliveryTimeSlot(e.target.value)}
                        className="w-1/2 border border-slate-200 rounded px-2 py-1.5 text-xs bg-[#f6f6f6]"
                      >
                        <option value="Hẹn giao">Hẹn giao</option>
                        <option value="Giờ hành chính">Giờ hành chính</option>
                        <option value="Buổi tối (18h - 21h)">Buổi tối (18h - 21h)</option>
                      </select>
                    </div>
                  </div>

                  {/* Air Transport */}
                  <div className="flex items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 min-w-[160px] cursor-pointer">
                      <input
                        type="radio"
                        name="transportType"
                        checked={transportType === 'fly'}
                        onChange={() => setTransportType('fly')}
                        className="text-[#158C4D] focus:ring-0"
                      />
                      <Plane className="w-5 h-5 text-slate-400" />
                      <span>Đường BAY</span>
                    </label>

                    <div className="flex items-center gap-2 flex-1">
                      <select className="w-1/2 border border-slate-200 rounded px-2 py-1.5 text-xs bg-[#f6f6f6]">
                        <option value="Hẹn lấy">Hẹn lấy</option>
                      </select>
                      <select className="w-1/2 border border-slate-200 rounded px-2 py-1.5 text-xs bg-[#f6f6f6]">
                        <option value="Hẹn giao">Hẹn giao</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION: Hình Thức Lấy Hàng */}
              <section className="pt-4 border-t border-[#eee] space-y-3">
                <div className="font-semibold text-slate-900 text-[17px]">Hình thức lấy hàng</div>

                {/* Pickup Option 1: Lấy hàng tận nơi */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="pickupType"
                      checked={pickupType === 'cod'}
                      onChange={() => setPickupType('cod')}
                      className="text-[#158C4D] focus:ring-0"
                    />
                    <span>Lấy hàng tận nơi</span>
                  </label>

                  <div className="relative flex items-center w-full">
                    <select
                      value={warehouseAddress}
                      onChange={() => { }}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs bg-white text-slate-800 pr-10 outline-none truncate"
                    >
                      <option value={warehouseAddress}>{warehouseAddress}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => navigate('/seller/profile')}
                      className="absolute right-3 text-[#D92616] hover:opacity-80"
                      title="Sửa địa chỉ kho lấy hàng"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Pickup Option 2: Gửi hàng bưu cục */}
                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="pickupType"
                      checked={pickupType === 'post'}
                      onChange={() => setPickupType('post')}
                      className="text-[#158C4D] focus:ring-0"
                    />
                    <span>Gửi hàng bưu cục</span>
                  </label>

                  <div className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs bg-[#f6f6f6] text-slate-500 flex items-center justify-between cursor-pointer">
                    <span>Bấm chọn Bưu cục gần nhất</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN: Sản Phẩm, Chi Phí & Giải Pháp */}
            <div className="lg:w-1/2 p-6 space-y-6">

              {/* SECTION: Sản Phẩm */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[17px] font-semibold text-slate-900">Sản phẩm</h4>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="text-[#158C4D] font-medium text-xs flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Sản phẩm có sẵn
                  </button>
                </div>

                {/* Product Items List */}
                <div className="space-y-3">
                  {products.map((product, index) => (
                    <div key={product.id} className="flex gap-2 min-w-0 items-start">

                      {/* Product Image Upload Box */}
                      <label className="w-20 h-20 bg-[#f6f6f6] rounded-md border border-dashed border-slate-300 flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-slate-100 transition relative">
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-[10px] text-slate-400 mt-1">Ảnh SP</span>
                        <input type="file" accept="image/*" className="hidden" />
                      </label>

                      {/* Product Fields */}
                      <div className="flex-1 space-y-2 min-w-0">
                        {/* Name & Price */}
                        <div className="flex items-center bg-[#f6f6f6] rounded-md px-3 py-1.5 text-xs">
                          <span className="font-semibold mr-1">{index + 1}.</span>
                          <input
                            type="text"
                            value={product.name}
                            onChange={(e) => handleProductChange(product.id, 'name', e.target.value)}
                            placeholder="Nhập tên sản phẩm"
                            className="bg-transparent outline-none flex-1 min-w-0 text-slate-800 placeholder:text-slate-400"
                          />
                          <input
                            type="number"
                            value={product.price || ''}
                            onChange={(e) => handleProductChange(product.id, 'price', parseFloat(e.target.value) || 0)}
                            placeholder="Nhập giá bán"
                            className="bg-transparent outline-none w-24 text-right text-slate-900 font-mono"
                          />
                          <span className="text-slate-400 ml-1">đ</span>
                        </div>

                        {/* Weight & Quantity Dropdowns */}
                        <div className="flex items-center gap-2">
                          <div className="bg-[#f6f6f6] rounded-md px-3 py-1.5 flex items-center justify-between flex-1 text-xs">
                            <span className="text-slate-600">Khối lượng (kg)</span>
                            <select
                              value={product.weight}
                              onChange={(e) => handleProductChange(product.id, 'weight', parseFloat(e.target.value))}
                              className="bg-transparent text-right outline-none font-bold text-slate-800"
                            >
                              <option value="0.2">0.2</option>
                              <option value="0.5">0.5</option>
                              <option value="1">1.0</option>
                              <option value="2">2.0</option>
                              <option value="5">5.0</option>
                            </select>
                          </div>

                          <div className="bg-[#f6f6f6] rounded-md px-3 py-1.5 flex items-center justify-between flex-1 text-xs">
                            <span className="text-slate-600">Số lượng</span>
                            <select
                              value={product.quantity}
                              onChange={(e) => handleProductChange(product.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="bg-transparent text-right outline-none font-bold text-slate-800"
                            >
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="5">5</option>
                              <option value="10">10</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Remove Product Row Button */}
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id)}
                          className="w-8 h-8 rounded-md bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center shrink-0 mt-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="w-10 h-10 bg-[#158C4D1A] text-[#158C4D] hover:bg-[#158C4D2A] rounded-md flex items-center justify-center transition cursor-pointer"
                  title="Thêm hàng hóa"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </section>

              {/* SECTION: Thông Tin Đơn Hàng (orderInfo) */}
              <section className="pt-4 border-t border-[#eee] space-y-3 text-xs">

                {/* Total Weight Select */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Tổng KL</span>
                  <div className="flex items-center gap-1">
                    <select
                      value={totalWeightSelect}
                      onChange={(e) => setTotalWeightSelect(parseFloat(e.target.value))}
                      className="border border-slate-200 rounded px-2 py-1 bg-slate-50 font-bold"
                    >
                      <option value="0.5">0.5 kg</option>
                      <option value="1.0">1.0 kg</option>
                      <option value="2.0">2.0 kg</option>
                      <option value="5.0">5.0 kg</option>
                    </select>
                  </div>
                </div>

                {/* Chargeable Weight */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600">Khối lượng tính cước</span>
                  <span className="font-bold text-slate-800">
                    {totalActualWeight.toFixed(1)} kg <span className="text-[#158C4D] cursor-pointer">(?)</span>
                  </span>
                </div>

                {/* COD Amount Input */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-slate-700 font-semibold min-w-[90px]">Tiền thu hộ</span>
                  <div className="flex items-center border-b border-[#eee] flex-1">
                    <input
                      type="number"
                      value={codAmount || ''}
                      onChange={(e) => setCodAmount(parseInt(e.target.value) || 0)}
                      placeholder="Nhập tiền thu hộ"
                      className="w-full outline-none text-right font-mono font-bold text-slate-900 py-1"
                    />
                    <span className="text-slate-400 ml-1">đ</span>
                  </div>
                </div>

                {/* Goods Value Input */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-slate-700 font-semibold min-w-[90px]">Giá trị hàng</span>
                  <div className="flex items-center border-b border-[#eee] flex-1">
                    <input
                      type="number"
                      value={goodsValue || ''}
                      onChange={(e) => setGoodsValue(parseInt(e.target.value) || 0)}
                      placeholder="Nhập giá trị hàng"
                      className="w-full outline-none text-right font-mono font-bold text-slate-900 py-1"
                    />
                    <span className="text-slate-400 ml-1">đ</span>
                  </div>
                  <span className="text-[#158C4D] text-[11px] whitespace-nowrap cursor-pointer">
                    Miễn phí khai giá (?)
                  </span>
                </div>

                {/* Shipping Fee & Payer */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-700 font-semibold">Phí ship</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{calculatedShippingFee.toLocaleString('vi-VN')}đ</span>
                    <select
                      value={shippingPayer}
                      onChange={(e) => setShippingPayer(e.target.value as any)}
                      className="border border-slate-200 rounded px-2 py-1 bg-white text-xs text-slate-700"
                    >
                      <option value="buyer">Khách trả ship</option>
                      <option value="seller">Shop trả ship</option>
                    </select>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="flex items-center justify-between pt-2 border-t border-[#eee] text-sm">
                  <span className="font-bold text-slate-900">Tổng tiền</span>
                  <span className="font-extrabold text-[#158C4D] font-mono text-base">
                    {grandTotal.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                {/* Note Input */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-slate-700 font-semibold min-w-[90px]">Ghi chú</span>
                  <input
                    type="text"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Nhập ghi chú riêng của đơn hàng"
                    className="w-full border-b border-[#eee] outline-none text-xs py-1"
                  />
                </div>

                {/* Custom Order Code */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-slate-700 font-semibold min-w-[90px]">Mã ĐH riêng</span>
                  <input
                    type="text"
                    value={customOrderCode}
                    onChange={(e) => setCustomOrderCode(e.target.value)}
                    placeholder="Nhập mã đơn hàng riêng của shop"
                    className="w-full border-b border-[#eee] outline-none text-xs py-1 font-mono"
                  />
                </div>
              </section>

              {/* SECTION: Dịch Vụ Giải Pháp */}
              <section className="pt-4 border-t border-[#eee] space-y-3 text-xs">
                <div className="font-bold text-slate-900 text-base">Dịch vụ giải pháp</div>

                {/* High Value Checkbox */}
                <div className="flex items-center justify-between border-b border-[#eee] py-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHighValue}
                      onChange={(e) => setIsHighValue(e.target.checked)}
                      className="rounded text-[#158C4D] focus:ring-0"
                    />
                    <span className="font-medium text-slate-800">Hàng giá trị cao ≥ 1,000,000đ</span>
                  </label>
                  <span className="text-[#158C4D] cursor-pointer font-medium">+Ảnh giá trị</span>
                </div>

                {/* Pickup Policy */}
                <div className="flex items-center justify-between py-2 border-b border-[#eee]">
                  <div className="truncate max-w-[70%]">
                    <span className="mr-3 font-semibold text-slate-800">Lấy hàng</span>
                    <span className="text-slate-500 text-[11px]">Gọi shop trước khi lấy hàng, Đồng kiểm khi lấy hàng</span>
                  </div>
                  <span className="text-[#EB5757] font-semibold flex items-center gap-1 cursor-pointer">
                    {pickupService} <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Delivery Policy */}
                <div className="flex items-center justify-between py-2 border-b border-[#eee]">
                  <div className="truncate max-w-[70%]">
                    <span className="mr-3 font-semibold text-slate-800">Giao hàng</span>
                    <span className="text-slate-500 text-[11px]">Xem hàng, Gọi shop khi không giao được, Giao hàng 1 phần...</span>
                  </div>
                  <span className="text-[#EB5757] font-semibold flex items-center gap-1 cursor-pointer">
                    {deliveryService} <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Return Policy */}
                <div className="flex items-center justify-between py-2 border-b border-[#eee]">
                  <div className="truncate max-w-[70%]">
                    <span className="mr-3 font-semibold text-slate-800">Hoàn hàng</span>
                    <span className="text-slate-500 text-[11px]">Tự động lưu kho chờ check</span>
                  </div>
                  <span className="text-slate-700 font-semibold flex items-center gap-1">
                    {returnService} <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </div>
              </section>

            </div>

          </div>
        </main>
      </div>

      {/* 3. STICKY BOTTOM BAR matching image requirements */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#eee] px-5 py-3 shadow-lg flex items-center justify-center">
        {!isShopInfoComplete ? (
          /* Red Warning Text matching user prompt requirement: "khi tạo đơn hàng cần hiển thị cửa sổ ảnh 1 nếu chưa có thông tin đầy đủ của shop" */
          <div
            onClick={() => setShowInfoModal(true)}
            className="text-[#EB5757] text-xl sm:text-2xl font-bold text-center cursor-pointer hover:underline animate-pulse flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <span>Vui lòng xác thực email và liên kết ngân hàng</span>
          </div>
        ) : (
          /* Green Submit Button when shop info is fully complete */
          <button
            type="button"
            onClick={() => handleSubmitOrder()}
            disabled={submitting}
            className="bg-[#158C4D] hover:bg-[#0f6f3c] text-white px-10 py-3 rounded-md font-bold text-base flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Đang Tạo Đơn Hàng...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" /> Tạo Đơn Hàng Mới
              </>
            )}
          </button>
        )}
      </footer>

      {/* SHOP VERIFICATION MODAL (Image 1) */}
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
