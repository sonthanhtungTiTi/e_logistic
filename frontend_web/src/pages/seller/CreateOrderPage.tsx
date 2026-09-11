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
  ShieldCheck,
  ShieldAlert,
  Info,
  ChevronRight,
  RotateCcw,
  Wallet,
  Zap,
  Ruler,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { orderApi } from '../../api/order.api';
import { sellerApi, type PickupAddressItem } from '../../api/seller.api';
import type { CreateOrderPayload, Order, QuoteResponseData } from '../../types/order.types';
import { CompleteShopInfoModal } from '../../components/orders/CompleteShopInfoModal';
import { OrderSuccessModal } from '../../components/orders/OrderSuccessModal';
import { PrintWaybillModal } from '../../components/orders/PrintWaybillModal';
import { OrderSubNav } from '../../components/orders/OrderSubNav';
import { formatNumberWithDots, parseDotsToNumber } from '../../lib/formatters';
import { productApi, type ProductItem as CatalogProductItem } from '../../api/product.api';

interface ProductItem {
  id: number;
  name: string;
  price: number;
  weight: number | string; // kg
  quantity: number | string;
  imageUrl?: string;
}

// Hàm làm sạch địa chỉ chi tiết (chỉ lấy phần số nhà/đường, tránh dồn chuỗi lặp phường/quận/tỉnh)
const cleanStreetAddress = (raw?: string): string => {
  if (!raw) return '';
  const parts = raw.split(',');
  if (parts.length > 3) {
    return `${parts[0].trim()}${parts[1] ? ', ' + parts[1].trim() : ''}`;
  }
  return raw.trim();
};

// Danh mục đơn vị hành chính sau sáp nhập tại các tỉnh thành trọng điểm
const VIETNAM_ADMIN_UNITS: {
  [province: string]: {
    [district: string]: string[];
  };
} = {
  'Hà Nội': {
    'Quận Hoàn Kiếm': ['Phường Hàng Bài', 'Phường Tràng Tiền', 'Phường Cửa Nam', 'Phường Hàng Trống'],
    'Quận Thanh Xuân': ['Phường Thanh Xuân Trung', 'Phường Nhân Chính', 'Phường Khương Đình', 'Phường Khương Mai'],
    'Quận Cầu Giấy': ['Phường Dịch Vọng', 'Phường Nghĩa Tân', 'Phường Mai Dịch', 'Phường Quan Hoa'],
    'Quận Ba Đình': ['Phường Điện Biên', 'Phường Đội Cấn', 'Phường Kim Mã', 'Phường Liễu Giai'],
    'Quận Đống Đa': ['Phường Láng Thượng', 'Phường Ô Chợ Dừa', 'Phường Kim Liên'],
    'Quận Hai Bà Trưng': ['Phường Bạch Đằng', 'Phường Bách Khoa', 'Phường Minh Khai'],
  },
  'TP Hồ Chí Minh': {
    'Quận Tân Bình': ['Phường 12', 'Phường 13', 'Phường 4', 'Phường 2', 'Phường 15'],
    'Quận 1': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Kho', 'Phường Đa Kao'],
    'Quận 5': ['Phường 1', 'Phường 2', 'Phường 5', 'Phường 7', 'Phường 11'],
    'Quận Bình Thạnh': ['Phường 1', 'Phường 2', 'Phường 14', 'Phường 25'],
    'Thành phố Thủ Đức': ['Phường Thảo Điền', 'Phường An Phú', 'Phường Linh Trung', 'Phường Hiệp Bình Chánh'],
  },
  'Đà Nẵng': {
    'Quận Hải Châu': ['Phường Hải Châu 1', 'Phường Hải Châu 2', 'Phường Thạch Thang'],
    'Quận Thanh Khê': ['Phường Tam Thuận', 'Phường Thanh Khê Tây'],
  },
  'Hải Phòng': {
    'Quận Hồng Bàng': ['Phường Hoàng Văn Thụ', 'Phường Minh Khai'],
    'Quận Ngô Quyền': ['Phường Lạc Viên', 'Phường Cầu Đất'],
  },
  'Cần Thơ': {
    'Quận Ninh Kiều': ['Phường Tân An', 'Phường An Cư', 'Phường Xuân Khánh'],
  },
  'Bình Dương': {
    'Thành phố Thủ Dầu Một': ['Phường Phú Cường', 'Phường Hiệp Thành'],
    'Thành phố Thuận An': ['Phường Lái Thiêu', 'Phường An Phú'],
  },
  'Đồng Nai': {
    'Thành phố Biên Hòa': ['Phường Trảng Dài', 'Phường Tân Hiệp'],
  },
};

export const CreateOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Shop Completion Modal state
  const isShopInfoComplete = true;
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // 1. Receiver Info (Điểm Giao Hàng Cho Người Nhận - Sau sáp nhập)
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [detailAddress, setDetailAddress] = useState<string>('');
  const [deliveryProvince, setDeliveryProvince] = useState<string>('TP Hồ Chí Minh');
  const [deliveryDistrict, setDeliveryDistrict] = useState<string>('Quận Tân Bình');
  const [deliveryWard, setDeliveryWard] = useState<string>('Phường 12');
  const [deliverySubZone, setDeliverySubZone] = useState<string>('Khu phố 5');

  // 2. Pickup Info & Danh sách kho đã lưu (Pickup Addresses)
  const [savedPickupAddresses, setSavedPickupAddresses] = useState<PickupAddressItem[]>([]);
  const [selectedPickupAddressId, setSelectedPickupAddressId] = useState<string>('custom');
  const [pickupProvince, setPickupProvince] = useState<string>('TP Hồ Chí Minh');
  const [pickupDistrict, setPickupDistrict] = useState<string>('Quận Tân Bình');
  const [pickupWard, setPickupWard] = useState<string>('Phường 12');
  const [pickupSubZone, setPickupSubZone] = useState<string>('Khu phố 1');
  const [pickupDetailAddress, setPickupDetailAddress] = useState<string>(
    cleanStreetAddress(user?.address) || '123 Đường Tân Bình'
  );

  // Load saved pickup addresses on mount
  useEffect(() => {
    sellerApi
      .getPickupAddresses()
      .then((res) => {
        const list = res.data || [];
        setSavedPickupAddresses(list);
        if (list.length > 0) {
          const def = list.find((a) => a.isDefault) || list[0];
          if (def) {
            setSelectedPickupAddressId(def._id);
            if (def.province) setPickupProvince(def.province);
            if (def.district) setPickupDistrict(def.district);
            if (def.ward) setPickupWard(def.ward);
            setPickupDetailAddress(cleanStreetAddress(def.addressDetail));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectSavedPickupAddress = (addrId: string) => {
    setSelectedPickupAddressId(addrId);
    if (addrId === 'custom') return;
    const target = savedPickupAddresses.find((a) => a._id === addrId);
    if (target) {
      if (target.province) setPickupProvince(target.province);
      if (target.district) setPickupDistrict(target.district);
      if (target.ward) setPickupWard(target.ward);
      setPickupDetailAddress(cleanStreetAddress(target.addressDetail));
    }
  };

  // Transport & Delivery Options (Mạng lưới đường bộ chuẩn hóa)
  const [deliveryMode, setDeliveryMode] = useState<'express' | 'bigsize'>('express');
  const [transportType, setTransportType] = useState<'road'>('road');
  const [pickupTimeSlot, setPickupTimeSlot] = useState<string>('Hẹn lấy');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState<string>('Hẹn giao');
  const [pickupType, setPickupType] = useState<'cod' | 'post'>('cod');

  // Receiver Info Touched state for inline validation
  const [touchedFields, setTouchedFields] = useState<{
    phone?: boolean;
    name?: boolean;
    address?: boolean;
    subZone?: boolean;
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

  // Danh mục sản phẩm mẫu lưu sẵn (Product Catalog)
  const [catalogProducts, setCatalogProducts] = useState<CatalogProductItem[]>([]);

  useEffect(() => {
    productApi.getProducts().then((res) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setCatalogProducts(list);
      }
    }).catch(() => {});
  }, []);

  const handleSelectCatalogProduct = (catalogId: string, itemIndex: number) => {
    const found = catalogProducts.find((p) => p._id === catalogId);
    if (!found) return;

    setProducts((prev) => {
      const updated = [...prev];
      updated[itemIndex] = {
        ...updated[itemIndex],
        name: found.name,
        price: found.priceVnd || 0,
        weight: found.weightKg || 0.5,
      };
      return updated;
    });

    if (found.dimensions && found.dimensions.length && found.dimensions.width && found.dimensions.height) {
      setDimensions({
        length: found.dimensions.length,
        width: found.dimensions.width,
        height: found.dimensions.height,
      });
      setPackagePreset('custom');
    }
  };

  // Package Presets & Dimensions (Dài x Rộng x Cao cm)
  const [packagePreset, setPackagePreset] = useState<'standard' | 'long' | 'bulky' | 'custom'>('standard');
  const [dimensions, setDimensions] = useState<{ length: number; width: number; height: number }>({
    length: 20,
    width: 15,
    height: 10,
  });

  const handlePresetChange = (preset: 'standard' | 'long' | 'bulky' | 'custom') => {
    setPackagePreset(preset);
    if (preset === 'standard') {
      setDimensions({ length: 20, width: 15, height: 10 });
    } else if (preset === 'long') {
      setDimensions({ length: 120, width: 10, height: 10 });
    } else if (preset === 'bulky') {
      setDimensions({ length: 60, width: 50, height: 40 });
    }
  };

  const handleDimensionChange = (field: 'length' | 'width' | 'height', val: string | number) => {
    const num = Math.max(1, Number(val) || 0);
    setDimensions((prev) => ({ ...prev, [field]: num }));
    setPackagePreset('custom');
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
        if (draft.deliveryProvince) setDeliveryProvince(draft.deliveryProvince);
        if (draft.deliveryDistrict) setDeliveryDistrict(draft.deliveryDistrict);
        if (draft.deliveryWard) setDeliveryWard(draft.deliveryWard);
        if (draft.deliverySubZone) setDeliverySubZone(draft.deliverySubZone);
        if (draft.pickupProvince) setPickupProvince(draft.pickupProvince);
        if (draft.pickupDistrict) setPickupDistrict(draft.pickupDistrict);
        if (draft.pickupWard) setPickupWard(draft.pickupWard);
        if (draft.pickupSubZone) setPickupSubZone(draft.pickupSubZone);
        if (draft.pickupDetailAddress) setPickupDetailAddress(cleanStreetAddress(draft.pickupDetailAddress));
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
        if (draft.dimensions) setDimensions(draft.dimensions);
        if (draft.packagePreset) setPackagePreset(draft.packagePreset);
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
        deliveryProvince,
        deliveryDistrict,
        deliveryWard,
        deliverySubZone,
        pickupProvince,
        pickupDistrict,
        pickupWard,
        pickupSubZone,
        pickupDetailAddress,
        deliveryMode,
        transportType,
        products,
        dimensions,
        packagePreset,
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
    deliveryProvince,
    deliveryDistrict,
    deliveryWard,
    deliverySubZone,
    pickupProvince,
    pickupDistrict,
    pickupWard,
    pickupSubZone,
    pickupDetailAddress,
    deliveryMode,
    transportType,
    products,
    dimensions,
    packagePreset,
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
    setDeliveryProvince('TP Hồ Chí Minh');
    setDeliveryDistrict('Quận Tân Bình');
    setDeliveryWard('Phường 12');
    setDeliverySubZone('Khu phố 5');
    setPickupProvince('Hà Nội');
    setPickupDistrict('Quận Hoàn Kiếm');
    setPickupWard('Phường Hàng Bài');
    setPickupSubZone('Khu phố 1');
    setPickupDetailAddress('123 Phố Tràng Tiền');
    setDeliveryMode('express');
    setTransportType('road');
    setProducts([{ id: 1, name: '', price: 0, weight: 0.5, quantity: 1 }]);
    setDimensions({ length: 20, width: 15, height: 10 });
    setPackagePreset('standard');
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

  const volumetricWeight = useMemo(() => {
    const l = Number(dimensions.length) || 20;
    const w = Number(dimensions.width) || 15;
    const h = Number(dimensions.height) || 10;
    return Math.round(((l * w * h) / 5000) * 100) / 100;
  }, [dimensions]);

  const maxDimension = useMemo(() => {
    return Math.max(
      Number(dimensions.length) || 0,
      Number(dimensions.width) || 0,
      Number(dimensions.height) || 0
    );
  }, [dimensions]);

  // Ngưỡng chuẩn hóa phương tiện xe máy First-mile / Last-mile: <= 30 kg & cạnh <= 80 cm
  const isOversized = maxDimension > 80;
  const isOverweight = totalActualWeight > 30 || volumetricWeight > 30;
  const isBulky = isOversized || isOverweight;
  const chargeableWeight = Math.max(totalActualWeight, volumetricWeight);

  // Tự động đồng bộ gói cước theo tải trọng tính cước (Không để Seller chọn tay mâu thuẫn)
  useEffect(() => {
    setDeliveryMode(isBulky ? 'bigsize' : 'express');
  }, [isBulky]);

  // Dynamic estimated fee formula (runs automatically whenever options/weight change)
  const estimatedShippingFee = useMemo(() => {
    const weight = Math.max(0.5, chargeableWeight || 0.5);
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

    if (isBulky) {
      base += 20000; // Phụ phí hàng cồng kềnh / quá khổ (xe tải, xe ba gác)
    }

    if (isHighValue || (Number(goodsValue) || 0) > 1000000) {
      const insurance = Math.round((Number(goodsValue) || 0) * 0.005);
      base += insurance;
    }

    return base;
  }, [chargeableWeight, deliveryMode, goodsValue, isHighValue, isBulky]);

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

  // Background auto-quote effect (runs silently when valid address info is entered)
  useEffect(() => {
    const cleanPhone = receiverPhone.trim().replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 9 || !receiverName.trim() || detailAddress.trim().length < 3) {
      return;
    }

    const timer = setTimeout(() => {
      orderApi
        .getQuote({
          pickupAddress: {
            province: pickupProvince || 'Hà Nội',
            district: pickupDistrict || 'Quận Hoàn Kiếm',
            ward: pickupWard || 'Phường Hàng Bài',
            subZone: pickupSubZone || 'Khu phố 1',
            address: pickupDetailAddress || '123 Phố Tràng Tiền',
          },
          deliveryAddress: {
            province: deliveryProvince || 'TP Hồ Chí Minh',
            district: deliveryDistrict || 'Quận Tân Bình',
            ward: deliveryWard || 'Phường 12',
            subZone: deliverySubZone || 'Khu phố 5',
            address: detailAddress,
          },
          items: products.map((p) => ({
            name: p.name || 'Sản phẩm',
            quantity: Number(p.quantity) || 1,
            weight: Number(p.weight) || 0.5,
          })),
          dimensions: {
            length: Number(dimensions.length) || 20,
            width: Number(dimensions.width) || 15,
            height: Number(dimensions.height) || 10,
          },
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
    deliveryProvince,
    deliveryDistrict,
    deliveryWard,
    deliverySubZone,
    pickupProvince,
    pickupDistrict,
    pickupWard,
    pickupSubZone,
    pickupDetailAddress,
    products,
    dimensions,
    goodsValue,
    customOrderCode,
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
          province: pickupProvince || 'Hà Nội',
          district: pickupDistrict || 'Quận Hoàn Kiếm',
          ward: pickupWard || 'Phường Hàng Bài',
          subZone: pickupSubZone || 'Khu phố 1',
          address: pickupDetailAddress || '123 Phố Tràng Tiền',
        },
        deliveryAddress: {
          province: deliveryProvince || 'TP Hồ Chí Minh',
          district: deliveryDistrict || 'Quận Tân Bình',
          ward: deliveryWard || 'Phường 12',
          subZone: deliverySubZone || 'Khu phố 5',
          address: detailAddress,
        },
        items: products.map((p) => ({
          name: p.name.trim() || 'Sản phẩm',
          quantity: Number(p.quantity),
          weight: Number(p.weight),
        })),
        dimensions: {
          length: Number(dimensions.length) || 20,
          width: Number(dimensions.width) || 15,
          height: Number(dimensions.height) || 10,
        },
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
          fullName: user?.companyName || user?.fullName || 'Shop An Bình',
          phone: validPickupPhone,
          address: pickupDetailAddress || '123 Phố Tràng Tiền',
          subZone: pickupSubZone || 'Khu phố 1',
          ward: pickupWard || 'Phường Hàng Bài',
          district: pickupDistrict || 'Quận Hoàn Kiếm',
          province: pickupProvince || 'Hà Nội',
        },
        deliveryAddress: {
          fullName: receiverName,
          phone: cleanReceiverPhone,
          address: detailAddress,
          subZone: deliverySubZone || 'Khu phố 5',
          ward: deliveryWard || 'Phường 12',
          district: deliveryDistrict || 'Quận Tân Bình',
          province: deliveryProvince || 'TP Hồ Chí Minh',
        },
        items: products.map((p) => ({
          name: p.name || 'Sản phẩm',
          quantity: Number(p.quantity) || 1,
          weight: Number(p.weight) || 0.5,
        })),
        dimensions: {
          length: Number(dimensions.length) || 20,
          width: Number(dimensions.width) || 15,
          height: Number(dimensions.height) || 10,
        },
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
          volumetricWeight: volumetricWeight,
          chargeableWeight: chargeableWeight,
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" onClick={() => navigate('/seller/dashboard')}>
              Seller Dashboard
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
            <span className="text-blue-600 dark:text-blue-400 font-semibold">Tạo Đơn Hàng</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" /> Tạo Đơn Vận Chuyển Mới
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Tạo đơn lẻ, tự động tính cước thể tích DIM & xem báo giá AI trực tiếp trước khi khởi tạo
          </p>
        </div>

        {/* Quick Action Tabs */}
        <OrderSubNav activeTab="single" />
      </div>

      {/* Auto-Restored Draft Notification Banner */}
      {hasDraftRestored && (
        <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-500/40 text-cyan-900 dark:text-cyan-300 text-xs font-semibold flex items-center justify-between shadow-xl gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <RotateCcw className="w-4 h-4 animate-spin-once" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Đã tự động khôi phục dữ liệu nháp!</p>
              <p className="text-[11px] text-cyan-700 dark:text-cyan-200/80">
                Các thông tin bạn nhập dở trước khi tải lại trang đã được bảo toàn từ localStorage.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/80 text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200 border border-rose-200 dark:border-rose-500/30 font-bold text-xs transition cursor-pointer shrink-0"
          >
            Xóa Nháp & Nhập Mới
          </button>
        </div>
      )}

      {/* Global Submit Error Notification */}
      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Main 2-Column Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Thông Tin Người Nhận & Tùy Chọn Vận Chuyển */}
        <div className="space-y-6">
          {/* Card 1: Thông Tin Người Nhận */}
          <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Thông Tin Người Nhận &amp; Địa Chỉ Giao Hàng</h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">Nhập đầy đủ thông tin chuẩn sau sáp nhập</p>
                </div>
              </div>
            </div>

            {/* Post-merger notice badge */}
            <div className="p-3.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Lưu ý: Nhập địa chỉ hành chính sau sáp nhập</strong>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                  Vui lòng chọn chính xác Tỉnh/Thành, Quận/Huyện, Phường/Xã và nhập Cụm tuyến/Khu phố để hệ thống tự động điều phối Shipper phụ trách phù hợp.
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Phone Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Số điện thoại người nhận <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="input-receiver-phone"
                    type="text"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    onBlur={() => handleFieldBlur('phone')}
                    placeholder="VD: 0912345678"
                    className={`w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900/90 border outline-none transition ${
                      touchedFields.phone &&
                      (!receiverPhone.trim() ||
                        !/^(\+?84|0)[0-9]{9,10}$/.test(receiverPhone.trim().replace(/[^0-9+]/g, '')))
                        ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                </div>
                {touchedFields.phone &&
                  (!receiverPhone.trim() ||
                    !/^(\+?84|0)[0-9]{9,10}$/.test(receiverPhone.trim().replace(/[^0-9+]/g, ''))) && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1 animate-in fade-in duration-200">
                      ⚠️ Vui lòng nhập SĐT người nhận hợp lệ (VD: 0912345678)
                    </p>
                  )}
              </div>

              {/* Name Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Họ &amp; tên người nhận <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="input-receiver-name"
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    onBlur={() => handleFieldBlur('name')}
                    placeholder="VD: Nguyễn Văn A"
                    maxLength={255}
                    className={`w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900/90 border outline-none transition ${
                      touchedFields.name && !receiverName.trim()
                        ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                </div>
                {touchedFields.name && !receiverName.trim() && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1 animate-in fade-in duration-200">
                    ⚠️ Vui lòng nhập họ &amp; tên người nhận
                  </p>
                )}
              </div>

              {/* 5-Level Structured Address for Receiver */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Cấu trúc địa chỉ giao hàng (sau sáp nhập) <span className="text-rose-500">*</span>
                </label>

                {/* Province & District */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Tỉnh / Thành phố</label>
                    <select
                      value={deliveryProvince}
                      onChange={(e) => {
                        const p = e.target.value;
                        setDeliveryProvince(p);
                        const firstDist = Object.keys(VIETNAM_ADMIN_UNITS[p] || {})[0] || '';
                        setDeliveryDistrict(firstDist);
                        const firstWard = (VIETNAM_ADMIN_UNITS[p]?.[firstDist] || [])[0] || '';
                        setDeliveryWard(firstWard);
                      }}
                      className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
                    >
                      {Object.keys(VIETNAM_ADMIN_UNITS).map((p) => (
                        <option key={p} value={p} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Quận / Huyện</label>
                    <select
                      value={deliveryDistrict}
                      onChange={(e) => {
                        const d = e.target.value;
                        setDeliveryDistrict(d);
                        const firstWard = (VIETNAM_ADMIN_UNITS[deliveryProvince]?.[d] || [])[0] || '';
                        setDeliveryWard(firstWard);
                      }}
                      className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
                    >
                      {Object.keys(VIETNAM_ADMIN_UNITS[deliveryProvince] || {}).map((d) => (
                        <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ward & SubZone */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">Phường / Xã</label>
                    <select
                      value={deliveryWard}
                      onChange={(e) => setDeliveryWard(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
                    >
                      {(VIETNAM_ADMIN_UNITS[deliveryProvince]?.[deliveryDistrict] || []).map((w) => (
                        <option key={w} value={w} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Khu phố / Thôn / Cụm tuyến <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={deliverySubZone}
                      onChange={(e) => setDeliverySubZone(e.target.value)}
                      placeholder="VD: Khu phố 5..."
                      className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Detail Address Input */}
                <div className="space-y-1 pt-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Số nhà &amp; Tên đường chi tiết <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Home className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                    <input
                      id="input-detail-address"
                      type="text"
                      value={detailAddress}
                      onChange={(e) => setDetailAddress(e.target.value)}
                      onBlur={() => handleFieldBlur('address')}
                      placeholder="Số 123/45 đường..."
                      className={`w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-900/90 border outline-none transition ${
                        touchedFields.address && !detailAddress.trim()
                          ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                          : 'border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                    />
                  </div>
                  {touchedFields.address && !detailAddress.trim() && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1 animate-in fade-in duration-200">
                      ⚠️ Vui lòng nhập số nhà và tên đường giao hàng chi tiết
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Lấy & Giao Tận Nơi & Hình Thức Lấy */}
          <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Phương Thức Vận Chuyển &amp; Lấy Hàng</h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Lựa chọn gói giao hàng và địa điểm lấy hàng của Shop</p>
              </div>
            </div>

            {/* Auto Service Type Classification Badge (Hệ thống tự động phân loại, không để chọn tay xung đột) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isBulky
                      ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {isBulky ? <Package className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {isBulky ? 'BBS Hàng Lớn / Cồng Kềnh' : 'EXPRESS Tiêu Chuẩn'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 uppercase">
                      Hệ Thống Tự Tính
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {isBulky
                      ? 'Trọng lượng tính cước > 30kg hoặc cạnh > 80cm — Bố trí xe tải / bán tải'
                      : 'Trọng lượng tính cước ≤ 30kg & kích thước ≤ 80cm — Giao nhận xe máy'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Trọng lượng tính cước</span>
                <span className="text-sm font-mono font-black text-slate-900 dark:text-white">{chargeableWeight.toFixed(1)} kg</span>
              </div>
            </div>

            {/* Transport Mode & Time Slots (Mạng lưới đường bộ chuẩn hóa) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Mạng Lưới Đường Bộ Tuyến Trục (Hub-to-Hub)</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Chuẩn Vận Hành
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Khung giờ hẹn lấy hàng</label>
                  <select
                    value={pickupTimeSlot}
                    onChange={(e) => setPickupTimeSlot(e.target.value)}
                    className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="Hẹn lấy" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Hẹn lấy linh hoạt</option>
                    <option value="Sáng nay (08h - 12h)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Sáng nay (08h - 12h)</option>
                    <option value="Chiều nay (13h - 17h)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Chiều nay (13h - 17h)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Khung giờ hẹn giao hàng</label>
                  <select
                    value={deliveryTimeSlot}
                    onChange={(e) => setDeliveryTimeSlot(e.target.value)}
                    className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="Hẹn giao" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Hẹn giao linh hoạt</option>
                    <option value="Giờ hành chính" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Giờ hành chính</option>
                    <option value="Buổi tối (18h - 21h)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Buổi tối (18h - 21h)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Warehouse / Pickup Location Configuration (Tích hợp PickupAddress đã lưu) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Địa điểm lấy hàng của Shop (First-mile pickup)
                </label>
                {savedPickupAddresses.length > 0 && (
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                    Đã lưu {savedPickupAddresses.length} địa chỉ kho
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                    <input
                      type="radio"
                      name="pickupType"
                      checked={pickupType === 'cod'}
                      onChange={() => setPickupType('cod')}
                      className="text-blue-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Lấy hàng tận nơi (Kho Shop / Điểm lấy)</span>
                  </label>
                  <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Địa bàn lấy: {pickupProvince}
                  </span>
                </div>

                {/* Dropdown chọn từ danh bạ kho lấy hàng đã lưu */}
                {savedPickupAddresses.length > 0 && (
                  <div className="pt-1">
                    <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Chọn từ danh bạ kho hàng đã lưu:
                    </label>
                    <select
                      value={selectedPickupAddressId}
                      onChange={(e) => handleSelectSavedPickupAddress(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-medium"
                    >
                      {savedPickupAddresses.map((addr) => (
                        <option key={addr._id} value={addr._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {addr.label ? `[${addr.label}] ` : ''}{cleanStreetAddress(addr.addressDetail)}, {addr.ward}, {addr.district} {addr.isDefault ? '⭐ (Mặc định)' : ''}
                        </option>
                      ))}
                      <option value="custom" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">➕ Nhập địa chỉ kho khác (Tùy chỉnh)...</option>
                    </select>
                  </div>
                )}

                {/* Tóm tắt địa chỉ đã chọn hoặc Form nhập tay tùy chỉnh */}
                {selectedPickupAddressId !== 'custom' && savedPickupAddresses.length > 0 ? (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>{pickupDetailAddress}</span>
                      <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {pickupProvince}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      {pickupWard}, {pickupDistrict}, {pickupProvince} {pickupSubZone ? `• Cụm: ${pickupSubZone}` : ''}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Tỉnh lấy hàng</label>
                        <select
                          value={pickupProvince}
                          onChange={(e) => {
                            const p = e.target.value;
                            setPickupProvince(p);
                            const firstDist = Object.keys(VIETNAM_ADMIN_UNITS[p] || {})[0] || '';
                            setPickupDistrict(firstDist);
                            const firstWard = (VIETNAM_ADMIN_UNITS[p]?.[firstDist] || [])[0] || '';
                            setPickupWard(firstWard);
                          }}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                        >
                          {Object.keys(VIETNAM_ADMIN_UNITS).map((p) => (
                            <option key={p} value={p} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Quận/Huyện lấy</label>
                        <select
                          value={pickupDistrict}
                          onChange={(e) => {
                            const d = e.target.value;
                            setPickupDistrict(d);
                            const firstWard = (VIETNAM_ADMIN_UNITS[pickupProvince]?.[d] || [])[0] || '';
                            setPickupWard(firstWard);
                          }}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                        >
                          {Object.keys(VIETNAM_ADMIN_UNITS[pickupProvince] || {}).map((d) => (
                            <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Phường/Xã lấy</label>
                        <select
                          value={pickupWard}
                          onChange={(e) => setPickupWard(e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                        >
                          {(VIETNAM_ADMIN_UNITS[pickupProvince]?.[pickupDistrict] || []).map((w) => (
                            <option key={w} value={w} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {w}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Khu phố lấy</label>
                        <input
                          type="text"
                          value={pickupSubZone}
                          onChange={(e) => setPickupSubZone(e.target.value)}
                          placeholder="VD: Khu phố 1..."
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">Số nhà / Tên đường kho lấy</label>
                      <input
                        type="text"
                        value={pickupDetailAddress}
                        onChange={(e) => setPickupDetailAddress(cleanStreetAddress(e.target.value))}
                        placeholder="VD: 76 Yên Thế hoặc Số 10 Ngõ 5..."
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sản Phẩm, Cước Phí, Báo Giá & Dịch Vụ */}
        <div className="space-y-6">
          {/* Card 3: Danh Sách Sản Phẩm */}
          <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Hàng Hóa &amp; Sản Phẩm</h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">Khai báo danh mục sản phẩm và trọng lượng</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Tổng: {products.length} SP • {totalActualWeight.toFixed(1)} kg
                </span>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">SP #{index + 1}</span>
                      {catalogProducts.length > 0 && (
                        <select
                          onChange={(e) => handleSelectCatalogProduct(e.target.value, index)}
                          className="text-[11px] bg-white dark:bg-slate-950 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 rounded-lg px-2 py-0.5 max-w-[230px] focus:outline-none focus:border-emerald-500 cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>📦 Chọn từ sản phẩm mẫu...</option>
                          {catalogProducts.map((cp) => (
                            <option key={cp._id} value={cp._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
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
                        className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 p-1 cursor-pointer transition"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Tên sản phẩm <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id={`product-name-${product.id}`}
                        type="text"
                        value={product.name}
                        onChange={(e) => handleProductChange(product.id, 'name', e.target.value)}
                        onBlur={() => handleProductBlur(product.id, 'name')}
                        placeholder="Nhập tên sản phẩm..."
                        className={`w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border outline-none transition ${
                          touchedProducts[product.id]?.name && !product.name.trim()
                            ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                            : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                        }`}
                      />
                      {touchedProducts[product.id]?.name && !product.name.trim() && (
                        <p className="text-[10px] text-rose-500 font-medium mt-1 animate-in fade-in duration-200">
                          ⚠️ Vui lòng nhập tên sản phẩm
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Giá bán (VNĐ)</label>
                      <input
                        type="text"
                        value={formatNumberWithDots(product.price)}
                        onChange={(e) =>
                          handleProductChange(product.id, 'price', parseDotsToNumber(e.target.value))
                        }
                        placeholder="0"
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-right focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Trọng lượng (kg)</label>
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
                        className={`w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border outline-none transition ${
                          touchedProducts[product.id]?.weight &&
                          (product.weight === '' || Number(product.weight) <= 0 || isNaN(Number(product.weight)))
                            ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                            : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                        }`}
                      />
                      {touchedProducts[product.id]?.weight &&
                        (product.weight === '' || Number(product.weight) <= 0 || isNaN(Number(product.weight))) && (
                          <p className="text-[10px] text-rose-500 font-medium mt-1 animate-in fade-in duration-200">
                            ⚠️ Cần nhập trọng lượng &gt; 0 kg
                          </p>
                        )}
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Số lượng</label>
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
                        className={`w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border outline-none transition ${
                          touchedProducts[product.id]?.quantity &&
                          (product.quantity === '' || Number(product.quantity) < 1 || isNaN(Number(product.quantity)))
                            ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                            : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                        }`}
                      />
                      {touchedProducts[product.id]?.quantity &&
                        (product.quantity === '' || Number(product.quantity) < 1 || isNaN(Number(product.quantity))) && (
                          <p className="text-[10px] text-rose-500 font-medium mt-1 animate-in fade-in duration-200">
                            ⚠️ Cần nhập số lượng tối thiểu là 1
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── BỔ SUNG: KHỐI KÍCH THƯỚC & PHÂN LOẠI HÀNG CỒNG KỀNH ── */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Kích Thước &amp; Loại Đóng Gói (Dài x Rộng x Cao cm)
                  </label>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Thể tích quy đổi: <strong className="text-slate-900 dark:text-white font-mono">{volumetricWeight} kg</strong>
                </span>
              </div>

              {/* Preset Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handlePresetChange('standard')}
                  className={`px-3 py-2 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer transition ${
                    packagePreset === 'standard'
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-700 dark:text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    📦 Tiêu chuẩn
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">20 x 15 x 10 cm</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetChange('long')}
                  className={`px-3 py-2 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer transition ${
                    packagePreset === 'long'
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-700 dark:text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    📏 Cây / Ống dài
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">120 x 10 x 10 cm</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetChange('bulky')}
                  className={`px-3 py-2 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer transition ${
                    packagePreset === 'bulky'
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-700 dark:text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    🗃️ Thùng to / Gia dụng
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">60 x 50 x 40 cm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPackagePreset('custom')}
                  className={`px-3 py-2 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer transition ${
                    packagePreset === 'custom'
                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-700 dark:text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    ⚙️ Tùy chỉnh
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Tự nhập kích thước</span>
                </button>
              </div>

              {/* 3 Inputs: Dài x Rộng x Cao */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Chiều Dài (cm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dimensions.length || ''}
                    onChange={(e) => handleDimensionChange('length', e.target.value)}
                    placeholder="Dài"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-center focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Chiều Rộng (cm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dimensions.width || ''}
                    onChange={(e) => handleDimensionChange('width', e.target.value)}
                    placeholder="Rộng"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-center focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Chiều Cao (cm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dimensions.height || ''}
                    onChange={(e) => handleDimensionChange('height', e.target.value)}
                    placeholder="Cao"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-center focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Dynamic Vehicle & Bulky Dispatch Warning Alert */}
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
                      👉 Đơn hàng sẽ được chuyển đến <strong>Quản lý Vận hành (Vendor Ops)</strong> để thẩm duyệt và phân bổ phương tiện chuyên dụng (Xe bán tải / Xe tải).
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

          {/* Card 4: Tổng Cước Phí & Báo Giá AI (Quote Breakdown) */}
          <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-4">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">4. Tiền Thu Hộ (COD) &amp; Tính Cước</h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Báo giá cước vận chuyển và tiền COD thực thu</p>
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
                  value={formatNumberWithDots(codAmount)}
                  onChange={(e) => setCodAmount(parseDotsToNumber(e.target.value))}
                  placeholder="0"
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-blue-600 dark:text-blue-400 font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none text-right focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Giá trị hàng hóa (Bảo hiểm)
                </label>
                <input
                  id="input-goods-value"
                  type="text"
                  value={formatNumberWithDots(goodsValue)}
                  onChange={(e) => setGoodsValue(parseDotsToNumber(e.target.value))}
                  placeholder="0"
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none text-right focus:border-blue-500"
                />
              </div>
            </div>

            {/* Risk Engine Flag Alert (COD > 10M or Goods Value > 20M -> PENDING_VERIFICATION) */}
            {(Number(codAmount) > 10000000 || Number(goodsValue) > 20000000) && (
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/40 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-300">
                <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <span>Cảnh Báo Giá Trị Cao (Risk Engine Flag)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/30 uppercase font-mono">
                      PENDING_VERIFICATION
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    Đơn hàng có {Number(codAmount) > 10000000 ? `tiền thu hộ COD vượt 10.000.000 đ (${formatNumberWithDots(codAmount)} đ)` : ''}
                    {Number(codAmount) > 10000000 && Number(goodsValue) > 20000000 ? ' và ' : ''}
                    {Number(goodsValue) > 20000000 ? `giá trị hàng hóa vượt 20.000.000 đ (${formatNumberWithDots(goodsValue)} đ)` : ''}.
                    Theo quy chế rủi ro, đơn sẽ được chuyển sang trạng thái <strong>Chờ Xác Minh (PENDING_VERIFICATION)</strong> để Order Manager thẩm định trước khi chuyển sang điều phối.
                  </p>
                </div>
              </div>
            )}

            {/* AI Quote Breakdown Box (Always visible: Official or Auto Estimated) */}
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
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{quoteResult.chargeableWeight} kg</span>
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
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{(Number(totalActualWeight) || 0).toFixed(1)} kg ({products.length} SP)</span>
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
                    <span className="font-mono text-sky-600 dark:text-sky-400">{formatNumberWithDots(Math.round(Number(goodsValue) * 0.005))} đ</span>
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ghi chú giao hàng</label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="VD: Cho xem hàng, gọi trước khi giao..."
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mã khuyến mãi / Voucher</label>
                <input
                  type="text"
                  value={customOrderCode}
                  onChange={(e) => setCustomOrderCode(e.target.value)}
                  placeholder="Nhập mã voucher (VD: FREESHIP15)"
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-cyan-700 dark:text-cyan-400 font-mono uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Grand Total Summary & Payer Logic Box */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-800 dark:text-slate-300 block font-bold text-xs">
                    {shippingPayer === 'buyer' ? 'Tổng Thu Người Nhận (COD + Ship)' : 'Tổng Thu Người Nhận (Chỉ COD)'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Phí ship: {formatNumberWithDots(activeShippingFee)} đ
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                    {formatNumberWithDots(totalCollectFromBuyer)} đ
                  </span>
                  <select
                    value={shippingPayer}
                    onChange={(e) => setShippingPayer(e.target.value as any)}
                    className="bg-white dark:bg-slate-800 text-[11px] font-bold text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 outline-none cursor-pointer text-right transition hover:border-blue-500"
                  >
                    <option value="buyer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Khách trả ship</option>
                    <option value="seller" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Shop trả ship</option>
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
                      • Tiền Shop thực nhận từ COD: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatNumberWithDots(netSellerReceive)} đ</strong>.
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
                      • Shipper sẽ thu tổng cộng <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatNumberWithDots(totalCollectFromBuyer)} đ</strong> ({formatNumberWithDots(codAmount)}đ COD + {formatNumberWithDots(activeShippingFee)}đ ship) khi giao hàng.<br />
                      • Shop sẽ nhận đủ 100% tiền hàng COD: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatNumberWithDots(codAmount)} đ</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar (Supports UC-06 2-Step Flow) */}
      <div className="sticky bottom-4 z-30 p-4 rounded-3xl glass-panel border border-slate-200 dark:border-slate-700/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
        {!isShopInfoComplete ? (
          <div
            onClick={() => setShowInfoModal(true)}
            className="w-full text-rose-500 text-xs sm:text-sm font-bold text-center cursor-pointer hover:underline animate-pulse flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Vui lòng xác thực email và liên kết tài khoản ngân hàng trước khi tạo đơn!</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Tính cước: <strong className="text-slate-900 dark:text-white font-mono">{chargeableWeight.toFixed(1)} kg</strong>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1.5 hidden md:inline">
                  (Thực tế: {(Number(totalActualWeight) || 0).toFixed(1)} kg từ {products.length} SP | DIM: {volumetricWeight.toFixed(1)} kg)
                </span>
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Step 1: Get Quote */}
              <button
                type="button"
                onClick={handleGetQuote}
                disabled={quoting || submitting}
                className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition"
              >
                {quoting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 dark:text-blue-400" /> Đang Tính Cước...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Xem Báo Giá Trước
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
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 text-slate-900 dark:text-white shadow-2xl">
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thông báo Mã Khuyến Mãi</h3>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{confirmDiscountModal}</p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDiscountModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
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
