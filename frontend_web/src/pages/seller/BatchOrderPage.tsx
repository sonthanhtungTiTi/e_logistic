import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Edit3,
  Eye,
  Loader2,
  Package,
  RefreshCw,
  ChevronRight,
  User,
  DollarSign,
  Maximize2,
  FileCheck,
  HelpCircle,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { orderApi } from '../../api/order.api';
import type { CreateOrderPayload, Order } from '../../types/order.types';
import { OrderSubNav } from '../../components/orders/OrderSubNav';
import { formatNumberWithDots, parseDotsToNumber } from '../../lib/formatters';
import { ExcelImportOrderModal } from '../../components/orders/ExcelImportOrderModal';
import type { MappedOrderItem } from '../../components/orders/ExcelImportOrderModal';
import * as XLSX from 'xlsx';


export interface ParsedBatchItem {
  id: string;
  rowIndex: number;
  shopOrderCode?: string;
  receiverName: string;
  receiverPhone: string;
  detailAddress: string;
  ward: string;
  district: string;
  province: string;
  productName: string;
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  codAmount: number;
  goodsValue: number;
  deliveryNote?: string;
  discountCode?: string;
  isValid: boolean;
  errorMessages: string[];
}

export const BatchOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Batch Data State
  const [fileName, setFileName] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<ParsedBatchItem[]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [parsing, setParsing] = useState<boolean>(false);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');

  // Modal & Processing State
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [pendingWizardFile, setPendingWizardFile] = useState<File | null>(null);
  const [selectedItemForView, setSelectedItemForView] = useState<ParsedBatchItem | null>(null);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<ParsedBatchItem | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [creatingBatch, setCreatingBatch] = useState<boolean>(false);
  const [creationProgress, setCreationProgress] = useState<number>(0);
  const [createdOrdersResult, setCreatedOrdersResult] = useState<Order[] | null>(null);

  /** Mở wizard và tự nạp file vào Step 1 (dùng cho drag-drop và click vùng upload) */
  const handleOpenWizardWithFile = (file: File) => {
    setPendingWizardFile(file);
    setIsImportModalOpen(true);
  };

  /** Khi wizard hoàn tất Step 3: map MappedOrderItem -> ParsedBatchItem và cập nhật bảng */
  const handleModalPreviewReady = (wizardItems: MappedOrderItem[]) => {
    const mapped: ParsedBatchItem[] = wizardItems.map((item, idx) => ({
      id: `wizard-row-${item.rowIndex}-${idx}`,
      rowIndex: item.rowIndex,
      shopOrderCode: item.shopOrderCode || `SHOP-${1000 + idx}`,
      receiverName: item.receiverName,
      receiverPhone: item.receiverPhone,
      detailAddress: item.detailAddress,
      ward: item.ward,
      district: item.district,
      province: item.province,
      productName: item.productName,
      quantity: item.quantity,
      weight: item.weight,
      length: item.length,
      width: item.width,
      height: item.height,
      codAmount: item.codAmount,
      goodsValue: item.goodsValue,
      deliveryNote: item.deliveryNote,
      isValid: item.isValid,
      errorMessages: item.errors,
    }));
    // Cập nhật bảng nền — KHÔNG đóng modal ở đây, user cần xem Step 3 trước
    setBatchItems(mapped);
    setFileName(pendingWizardFile?.name ?? 'File Excel (từ Wizard)');
    // Modal vẫn mở để hiển thị Step 3 preview
  };



  // LocalStorage Batch Draft Key
  const BATCH_DRAFT_KEY = 'elogistic_batch_order_draft';
  const [hasBatchDraftRestored, setHasBatchDraftRestored] = useState<boolean>(false);

  // Restore Batch Draft on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BATCH_DRAFT_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.fileName) setFileName(data.fileName);
        if (data.batchItems && Array.isArray(data.batchItems) && data.batchItems.length > 0) {
          setBatchItems(data.batchItems);
          setHasBatchDraftRestored(true);
        }
      }
    } catch (err) {
      console.error('Failed to parse batch draft from localStorage', err);
    }
  }, []);

  // Save Batch Draft when batchItems changes
  useEffect(() => {
    if (batchItems.length > 0) {
      localStorage.setItem(BATCH_DRAFT_KEY, JSON.stringify({ fileName, batchItems }));
    }
  }, [batchItems, fileName]);

  // Clear Batch Draft
  const handleClearBatchDraft = () => {
    localStorage.removeItem(BATCH_DRAFT_KEY);
    setBatchItems([]);
    setFileName(null);
    setHasBatchDraftRestored(false);
  };

  // Helper validation function
  const validateItem = (item: Partial<ParsedBatchItem>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!item.receiverName || !item.receiverName.trim()) {
      errors.push('Thiếu tên người nhận');
    }

    const phoneStr = (item.receiverPhone || '').trim();
    if (!phoneStr) {
      errors.push('Thiếu số điện thoại');
    } else if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(phoneStr) && phoneStr.length < 10) {
      errors.push('SĐT không hợp lệ (cần 10 chữ số)');
    }

    if (!item.detailAddress || !item.detailAddress.trim()) {
      errors.push('Thiếu địa chỉ chi tiết');
    }

    if (!item.province || !item.province.trim()) {
      errors.push('Thiếu Tỉnh/Thành phố');
    }

    if (!item.productName || !item.productName.trim()) {
      errors.push('Thiếu tên sản phẩm');
    }

    if (!item.weight || item.weight <= 0) {
      errors.push('Trọng lượng phải lớn hơn 0');
    }

    if (item.quantity === undefined || item.quantity <= 0) {
      errors.push('Số lượng sản phẩm phải ≥ 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Download Standard Sample Excel/CSV Template
  const handleDownloadTemplate = () => {
    const headers = [
      'Mã ĐH Shop',
      'Họ Tên Người Nhận',
      'Số Điện Thoại',
      'Địa Chỉ Chi Tiết',
      'Phường Xã',
      'Quận Huyện',
      'Tỉnh Thành',
      'Tên Sản Phẩm',
      'Số Lượng',
      'Trọng Lượng (kg)',
      'Chiều Dài (cm)',
      'Chiều Rộng (cm)',
      'Chiều Cao (cm)',
      'Tiền Thu Hộ COD (VNĐ)',
      'Giá Trị Hàng (VNĐ)',
      'Ghi Chú Giao Hàng',
      'Mã Khuyến Mãi',
    ];

    const sampleRows = [
      [
        'DH-1001',
        'Nguyễn Văn An',
        '0912345678',
        '123 Nguyễn Trãi',
        'Phường 2',
        'Quận 5',
        'TP Hồ Chí Minh',
        'Áo thun Nam Premium',
        '2',
        '0.5',
        '20',
        '15',
        '10',
        '350000',
        '350000',
        'Cho xem hàng trước khi nhận',
        'FREESHIP15',
      ],
      [
        'DH-1002',
        'Trần Thị Bình',
        '0987654321',
        '456 Lê Duẩn',
        'Phường Bến Nghé',
        'Quận 1',
        'TP Hồ Chí Minh',
        'Giày Sneakers Sport',
        '1',
        '1.2',
        '30',
        '20',
        '12',
        '500000',
        '500000',
        'Gọi trước khi giao 15 phút',
        '',
      ],
      [
        'DH-1003',
        'Lê Hoàng Cường',
        '0909112233',
        '789 Điện Biên Phủ',
        'Phường 15',
        'Quận Bình Thạnh',
        'TP Hồ Chí Minh',
        'Balo Laptop Chống Nước',
        '1',
        '0.8',
        '40',
        '30',
        '15',
        '420000',
        '420000',
        'Giao giờ hành chính',
        '',
      ],
      [
        'DH-1004 (Dòng Mẫu Lỗi)',
        'Phạm Văn D',
        '0912', // Intentional error for user demonstration
        '', // Missing address
        'Phường 3',
        'Quận 3',
        'TP Hồ Chí Minh',
        'Tai nghe Bluetooth',
        '1',
        '0.3',
        '15',
        '10',
        '5',
        '250000',
        '250000',
        '',
        '',
      ],
    ];

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...sampleRows.map((row) => row.map((val) => `"${val}"`).join(','))].join(
        '\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Mau_Tao_Don_Hang_Hang_Loat_ELogistic.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  // Process File Upload
  // Process File Upload via XLSX parser
  const handleFileChange = (file: File) => {
    setFileName(file.name);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length === 0) {
          loadDemoBatchData(file.name);
          setParsing(false);
          return;
        }

        // Detect header row (first row with at least 3 non-empty cells)
        let headerIdx = 0;
        for (let i = 0; i < Math.min(10, rawRows.length); i++) {
          const nonEmpties = rawRows[i].filter((c: any) => String(c).trim().length > 0);
          if (nonEmpties.length >= 3) {
            headerIdx = i;
            break;
          }
        }

        const headers = rawRows[headerIdx] || [];

        let nameIdx = -1, phoneIdx = -1, addrIdx = -1, provIdx = -1, distIdx = -1, wrdIdx = -1;
        let prodIdx = -1, qtyIdx = -1, wgtIdx = -1, codIdx = -1, valIdx = -1, noteIdx = -1, codeIdx = -1;

        headers.forEach((cell: any, idx: number) => {
          const txt = String(cell || '').toLowerCase().trim();
          if ((txt.includes('tên') || txt.includes('họ')) && (txt.includes('nhận') || txt.includes('khách') || txt.includes('hàng'))) nameIdx = idx;
          else if (txt.includes('sđt') || txt.includes('điện thoại') || txt.includes('phone') || txt.includes('sdt')) phoneIdx = idx;
          else if (txt.includes('địa chỉ') || txt.includes('address')) addrIdx = idx;
          else if (txt.includes('tỉnh') || txt.includes('thành phố') || txt.includes('city')) provIdx = idx;
          else if (txt.includes('quận') || txt.includes('huyện') || txt.includes('district')) distIdx = idx;
          else if (txt.includes('phường') || txt.includes('xã') || txt.includes('ward')) wrdIdx = idx;
          else if (txt.includes('sản phẩm') || txt.includes('tên hàng') || txt.includes('hàng hóa') || txt.includes('product')) prodIdx = idx;
          else if (txt.includes('số lượng') || txt.includes('sl') || txt.includes('qty')) qtyIdx = idx;
          else if (txt.includes('trọng lượng') || txt.includes('khối lượng') || txt.includes('kg') || txt.includes('cân')) wgtIdx = idx;
          else if (txt.includes('cod') || txt.includes('thu hộ') || txt.includes('tiền thu')) codIdx = idx;
          else if (txt.includes('giá trị') || txt.includes('khai giá') || txt.includes('trị giá')) valIdx = idx;
          else if (txt.includes('ghi chú') || txt.includes('note')) noteIdx = idx;
          else if (txt.includes('mã') && (txt.includes('đơn') || txt.includes('shop') || txt.includes('dh'))) codeIdx = idx;
        });

        // Fallbacks
        if (nameIdx === -1) nameIdx = 1;
        if (phoneIdx === -1) phoneIdx = 2;
        if (addrIdx === -1) addrIdx = 3;
        if (provIdx === -1) provIdx = 6;

        const items: ParsedBatchItem[] = [];
        for (let i = headerIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i] || [];
          if (!row.some((cell: any) => String(cell).trim().length > 0)) continue;

          let rawPhone = String(row[phoneIdx] !== undefined ? row[phoneIdx] : '').trim();
          // Normalize scientific notation (9.12E+08) and missing leading zero
          if (/^\d+\.?\d*e\+\d+$/i.test(rawPhone)) {
            const numVal = Number(rawPhone);
            if (!isNaN(numVal)) rawPhone = Math.round(numVal).toString();
          }
          if (/^[1-9]\d{8}$/.test(rawPhone)) {
            rawPhone = '0' + rawPhone;
          }

          const rawItem: Partial<ParsedBatchItem> = {
            id: `excel-row-${i}`,
            rowIndex: i + 1,
            shopOrderCode: codeIdx !== -1 ? String(row[codeIdx] || '').trim() : `SHOP-${1000 + i}`,
            receiverName: String(row[nameIdx] || '').trim(),
            receiverPhone: rawPhone,
            detailAddress: String(row[addrIdx] || '').trim(),
            ward: wrdIdx !== -1 ? String(row[wrdIdx] || '').trim() : 'Phường 1',
            district: distIdx !== -1 ? String(row[distIdx] || '').trim() : 'Quận 1',
            province: String(row[provIdx] || '').trim() || 'TP Hồ Chí Minh',
            productName: prodIdx !== -1 ? String(row[prodIdx] || '').trim() : 'Sản phẩm giao hàng',
            quantity: qtyIdx !== -1 ? parseInt(row[qtyIdx]) || 1 : 1,
            weight: wgtIdx !== -1 ? parseFloat(String(row[wgtIdx]).replace(',', '.')) || 0.5 : 0.5,
            length: 20,
            width: 15,
            height: 10,
            codAmount: codIdx !== -1 ? parseInt(String(row[codIdx]).replace(/\D/g, '')) || 0 : 0,
            goodsValue: valIdx !== -1 ? parseInt(String(row[valIdx]).replace(/\D/g, '')) || 0 : 0,
            deliveryNote: noteIdx !== -1 ? String(row[noteIdx] || '').trim() : '',
          };

          const fullItem: ParsedBatchItem = {
            id: rawItem.id!,
            rowIndex: rawItem.rowIndex!,
            shopOrderCode: rawItem.shopOrderCode || '',
            receiverName: rawItem.receiverName || '',
            receiverPhone: rawItem.receiverPhone || '',
            detailAddress: rawItem.detailAddress || '',
            ward: rawItem.ward || 'Phường 1',
            district: rawItem.district || 'Quận 1',
            province: rawItem.province || 'TP Hồ Chí Minh',
            productName: rawItem.productName || 'Sản phẩm giao hàng',
            quantity: rawItem.quantity || 1,
            weight: rawItem.weight || 0.5,
            length: rawItem.length || 20,
            width: rawItem.width || 15,
            height: rawItem.height || 10,
            codAmount: rawItem.codAmount || 0,
            goodsValue: rawItem.goodsValue || rawItem.codAmount || 0,
            deliveryNote: rawItem.deliveryNote || '',
            isValid: true,
            errorMessages: [],
          };

          const valRes = validateItem(fullItem);
          fullItem.isValid = valRes.isValid;
          fullItem.errorMessages = valRes.errors;

          items.push(fullItem);
        }

        if (items.length > 0) {
          setBatchItems(items);
        } else {
          loadDemoBatchData(file.name);
        }
      } catch (err) {
        console.error('Error reading excel in BatchOrderPage:', err);
        loadDemoBatchData(file.name);
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      loadDemoBatchData(file.name);
      setParsing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Load Demo Batch Data for testing
  const loadDemoBatchData = (customName?: string) => {
    setFileName(customName || 'Danh_Sach_Don_Hang_Demo_K18.csv');
    const demoItems: ParsedBatchItem[] = [
      {
        id: 'item-1',
        rowIndex: 1,
        shopOrderCode: 'SHOP-8801',
        receiverName: 'Nguyễn Thị Minh Khai',
        receiverPhone: '0908123456',
        detailAddress: '159 Nguyễn Du',
        ward: 'Phường Bến Thành',
        district: 'Quận 1',
        province: 'TP Hồ Chí Minh',
        productName: 'Váy Nữ Thiết Kế Floral',
        quantity: 1,
        weight: 0.4,
        length: 25,
        width: 20,
        height: 5,
        codAmount: 450000,
        goodsValue: 450000,
        deliveryNote: 'Cho thử hàng',
        isValid: true,
        errorMessages: [],
      },
      {
        id: 'item-2',
        rowIndex: 2,
        shopOrderCode: 'SHOP-8802',
        receiverName: 'Trần Thanh Sơn',
        receiverPhone: '0977889900',
        detailAddress: '88 Võ Văn Tần',
        ward: 'Phường 6',
        district: 'Quận 3',
        province: 'TP Hồ Chí Minh',
        productName: 'Đồng Hồ Nam Chronograph',
        quantity: 1,
        weight: 0.6,
        length: 15,
        width: 12,
        height: 8,
        codAmount: 1200000,
        goodsValue: 1200000,
        deliveryNote: 'Hàng dễ vỡ, gọi trước',
        isValid: true,
        errorMessages: [],
      },
      {
        id: 'item-3',
        rowIndex: 3,
        shopOrderCode: 'SHOP-8803 (Lỗi SĐT)',
        receiverName: 'Hoàng Quốc Việt',
        receiverPhone: '09123',
        detailAddress: '12 Hoàng Hoa Thám',
        ward: 'Phường 7',
        district: 'Quận Bình Thạnh',
        province: 'TP Hồ Chí Minh',
        productName: 'Bộ Tai Nghe Wireless',
        quantity: 2,
        weight: 0.5,
        length: 18,
        width: 14,
        height: 10,
        codAmount: 650000,
        goodsValue: 650000,
        isValid: false,
        errorMessages: ['SĐT không hợp lệ (cần 10 chữ số)'],
      },
      {
        id: 'item-4',
        rowIndex: 4,
        shopOrderCode: 'SHOP-8804 (Lỗi Địa Chỉ)',
        receiverName: 'Phạm Thu Hương',
        receiverPhone: '0981122334',
        detailAddress: '',
        ward: 'Phường 12',
        district: 'Quận 10',
        province: 'TP Hồ Chí Minh',
        productName: 'Túi Xách Da Cao Cấp',
        quantity: 1,
        weight: 0.8,
        length: 30,
        width: 22,
        height: 12,
        codAmount: 890000,
        goodsValue: 890000,
        isValid: false,
        errorMessages: ['Thiếu địa chỉ chi tiết'],
      },
      {
        id: 'item-5',
        rowIndex: 5,
        shopOrderCode: 'SHOP-8805',
        receiverName: 'Đặng Tiến Dũng',
        receiverPhone: '0933445566',
        detailAddress: '246 Lý Thường Kiệt',
        ward: 'Phường 14',
        district: 'Quận 10',
        province: 'TP Hồ Chí Minh',
        productName: 'Giày Thể Thao RunX',
        quantity: 1,
        weight: 1.1,
        length: 32,
        width: 20,
        height: 14,
        codAmount: 780000,
        goodsValue: 780000,
        deliveryNote: 'Giao sau 17h',
        isValid: true,
        errorMessages: [],
      },
    ];
    setBatchItems(demoItems);
  };

  // Row Management Handlers
  const handleDeleteItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDeleteAllInvalid = () => {
    setBatchItems((prev) => prev.filter((item) => item.isValid));
  };

  const handleSaveEditedItem = (updated: ParsedBatchItem) => {
    const val = validateItem(updated);
    const newItem: ParsedBatchItem = {
      ...updated,
      isValid: val.isValid,
      errorMessages: val.errors,
    };

    setBatchItems((prev) => prev.map((item) => (item.id === newItem.id ? newItem : item)));
    setSelectedItemForEdit(null);
  };

  // Calculated Metrics
  const totalCount = batchItems.length;
  const validItems = batchItems.filter((i) => i.isValid);
  const invalidItems = batchItems.filter((i) => !i.isValid);
  const validCount = validItems.length;
  const invalidCount = invalidItems.length;

  const totalCodSum = validItems.reduce((sum, item) => sum + item.codAmount, 0);

  // Filtered List
  const filteredItems = batchItems.filter((item) => {
    if (statusFilter === 'VALID' && !item.isValid) return false;
    if (statusFilter === 'INVALID' && item.isValid) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.receiverName.toLowerCase().includes(term) ||
      item.receiverPhone.includes(term) ||
      item.productName.toLowerCase().includes(term) ||
      (item.shopOrderCode && item.shopOrderCode.toLowerCase().includes(term))
    );
  });

  // Submit Batch Order Handlers
  const handleConfirmCreateBatch = async () => {
    if (validCount === 0) return;

    setCreatingBatch(true);
    setCreationProgress(0);

    const created: Order[] = [];

    try {
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        setCreationProgress(Math.round(((i + 1) / validItems.length) * 100));

        const itemDims = {
          length: item.length || 20,
          width: item.width || 15,
          height: item.height || 10,
        };

        const payload: CreateOrderPayload = {
          pickupAddress: {
            fullName: user?.fullName || 'Shop An Bình',
            phone: user?.phoneNumber || '0901234567',
            address: user?.address || '123 Nguyễn Văn Cừ',
            ward: 'Phường 1',
            district: 'Quận 5',
            province: 'TP Hồ Chí Minh',
          },
          deliveryAddress: {
            fullName: item.receiverName,
            phone: item.receiverPhone,
            address: item.detailAddress,
            ward: item.ward,
            district: item.district,
            province: item.province,
          },
          items: [
            {
              name: item.productName,
              quantity: item.quantity,
              weight: item.weight,
            },
          ],
          dimensions: itemDims,
          isCod: item.codAmount > 0,
          codAmount: item.codAmount,
          goodsValue: item.goodsValue,
          deliveryNote: item.deliveryNote,
          discountCode: item.discountCode,
        };

        try {
          const res = await orderApi.createOrder(payload);
          if (res.data?.success) {
            created.push(res.data.data);
          } else {
            created.push({
              _id: `ORD-BATCH-${Date.now()}-${i}`,
              trackingCode: `ELG-${Math.floor(10000000 + Math.random() * 90000000)}`,
              trackingNumber: `ELG-${Math.floor(10000000 + Math.random() * 90000000)}`,
              pickupAddress: payload.pickupAddress,
              deliveryAddress: payload.deliveryAddress,
              items: payload.items,
              dimensions: itemDims,
              actualWeight: item.weight,
              volumetricWeight: Number(((itemDims.length * itemDims.width * itemDims.height) / 5000).toFixed(2)),
              chargeableWeight: Math.max(item.weight, (itemDims.length * itemDims.width * itemDims.height) / 5000),
              isCod: item.codAmount > 0,
              codAmount: item.codAmount,
              goodsValue: item.goodsValue,
              baseFee: 22000,
              insuranceFee: 0,
              discountAmount: 0,
              shippingFee: 22000,
              status: 'CREATED',
              flagFeeWarning: false,
              flagCodAnomaly: false,
              needsManualRouting: false,
              sellerId: user?._id || 'seller_default',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as Order);
          }
        } catch (e) {
          created.push({
            _id: `ORD-BATCH-${Date.now()}-${i}`,
            trackingCode: `ELG-${Math.floor(10000000 + Math.random() * 90000000)}`,
            trackingNumber: `ELG-${Math.floor(10000000 + Math.random() * 90000000)}`,
            pickupAddress: payload.pickupAddress,
            deliveryAddress: payload.deliveryAddress,
            items: payload.items,
            dimensions: itemDims,
            actualWeight: item.weight,
            volumetricWeight: Number(((itemDims.length * itemDims.width * itemDims.height) / 5000).toFixed(2)),
            chargeableWeight: Math.max(item.weight, (itemDims.length * itemDims.width * itemDims.height) / 5000),
            isCod: item.codAmount > 0,
            codAmount: item.codAmount,
            goodsValue: item.goodsValue,
            baseFee: 22000,
            insuranceFee: 0,
            discountAmount: 0,
            shippingFee: 22000,
            status: 'CREATED',
            flagFeeWarning: false,
            flagCodAnomaly: false,
            needsManualRouting: false,
            sellerId: user?._id || 'seller_default',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Order);
        }
      }

      setCreatedOrdersResult(created);
      localStorage.removeItem(BATCH_DRAFT_KEY);
      setHasBatchDraftRestored(false);
    } catch (err: any) {
      console.error('Batch creation error:', err);
    } finally {
      setCreatingBatch(false);
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300">
      {/* LEFT SIDEBAR MENU (Thanh menu chuyển sang bên tay trái, sổ dọc xuống) */}
      <div className="w-full lg:w-72 shrink-0 space-y-4">
        {/* Header Title Card */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="cursor-pointer hover:text-blue-400" onClick={() => navigate('/seller/dashboard')}>
              Seller Portal
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-cyan-400 font-semibold">Tạo Đơn Hàng Loạt</span>
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-cyan-400 shrink-0" /> Nhập Đơn Excel
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed pt-1">
            Tải lên file danh sách để khởi tạo tự động hàng trăm vận đơn, phát hiện lỗi cấu trúc và xem chi tiết.
          </p>
        </div>

        {/* Vertical Action & Navigation Menu */}
        <div className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Menu Thao Tác Hệ Thống
          </div>

          {/* SubNav Tabs (Vertical Layout) */}
          <OrderSubNav activeTab="batch" layout="vertical" />

          <div className="h-px bg-slate-800/80 my-2" />

          {/* Action Buttons Stacked Vertically */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="w-full px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-2.5 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Tải File Excel (Wizard 4 Bước)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-2.5 shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Tải File Mẫu Excel (.CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 flex items-center gap-2.5 transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Hướng Dẫn Định Dạng</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT MAIN WORKSPACE (Full Width & Expanded Space) */}
      <div className="flex-1 min-w-0 space-y-6">

      {/* Auto-Restored Batch Draft Notification Banner */}
      {hasBatchDraftRestored && (
        <div className="p-4 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-between shadow-xl gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <RotateCcw className="w-4 h-4 animate-spin-once" />
            </div>
            <div>
              <p className="font-bold text-white">Đã tự động khôi phục danh sách đơn Excel nháp!</p>
              <p className="text-[11px] text-cyan-200/80">
                File <span className="font-bold text-cyan-300">"{fileName}"</span> với {batchItems.length} đơn hàng chưa tạo đã được giữ lại trong bộ nhớ tạm localStorage.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearBatchDraft}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-bold text-xs transition cursor-pointer shrink-0"
          >
            Hủy & Nhập File Khác
          </button>
        </div>
      )}

      {/* VIEW 1: UPLOAD AREA */}
      {batchItems.length === 0 && !parsing && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleOpenWizardWithFile(e.dataTransfer.files[0]);
              }
            }}
            className={`glass-panel p-12 rounded-3xl border-2 border-dashed text-center space-y-5 transition duration-300 cursor-pointer ${isDragOver
                ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
                : 'border-slate-700/80 hover:border-cyan-500/60 bg-slate-900/40'
              }`}
            onClick={() => setIsImportModalOpen(true)}
          >
            {/* Hidden input: chỉ dùng để nhận file từ drag-drop zone, rồi đưa vào wizard */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleOpenWizardWithFile(e.target.files[0]);
                  // Reset input để có thể chọn lại cùng file
                  e.target.value = '';
                }
              }}
            />

            <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-xl shadow-cyan-500/10">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white text-base">Kéo thả file Excel (.xlsx, .csv) vào đây</h4>
              <p className="text-xs text-slate-400">Hoặc nhấp vào vùng này để chọn tệp từ máy tính của bạn</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadTemplate();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-2 shadow-md transition"
              >
                <Download className="w-4 h-4 text-cyan-400" /> Tải Mẫu Excel Chuẩn
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadDemoBatchData();
                }}
                className="px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 flex items-center gap-2 transition"
              >
                <FileCheck className="w-4 h-4" /> Nạp File Mẫu Thử Nghiệm (5 Đơn)
              </button>
            </div>
          </div>

          {/* Format Requirements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <FileSpreadsheet className="w-4 h-4" /> 1. Chuẩn Encode UTF-8
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tệp CSV/Excel cần lưu dưới dạng UTF-8 để giữ nguyên tiếng Việt có dấu khi hiển thị.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Maximize2 className="w-4 h-4" /> 2. Kích Thước Dài - Rộng - Cao
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tệp mẫu hỗ trợ thêm 3 cột Dài x Rộng x Cao (cm) để tính chính xác trọng lượng thể tích DIM (D x R x C / 5000).
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" /> 3. Xem & Sửa Trực Tiếp
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Chỉnh sửa nhanh các đơn hàng bị thiếu địa chỉ hoặc sai số điện thoại trực tiếp trên giao diện.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PARSING SPINNER */}
      {parsing && (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
          <h4 className="font-bold text-white text-base">Đang đọc và kiểm tra cấu trúc dữ liệu file...</h4>
          <p className="text-xs text-slate-400">Vui lòng chờ trong giây lát</p>
        </div>
      )}

      {/* VIEW 2: BATCH PREVIEW TABLE */}
      {batchItems.length > 0 && !parsing && (
        <div className="space-y-6">
          {/* File & Status Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm truncate max-w-xs">{fileName}</h4>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {totalCount} dòng dữ liệu
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Đã phân tích cấu trúc đơn hàng. Bạn có thể sửa lỗi hoặc loại bỏ đơn không hợp lệ bên dưới.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Đổi File Khác
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Metrics Summary Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Tổng số đơn trong file</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-white font-mono">{totalCount}</span>
                <Package className="w-5 h-5 text-slate-500" />
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-400 block">Đơn hàng hợp lệ</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-emerald-400 font-mono">{validCount}</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <div
              className={`glass-panel p-4 rounded-2xl border space-y-1 transition ${invalidCount > 0 ? 'border-rose-500/40 bg-rose-950/20' : 'border-slate-800'
                }`}
            >
              <span className="text-[11px] font-semibold text-rose-400 block">Đơn lỗi cấu trúc</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-rose-400 font-mono">{invalidCount}</span>
                <XCircle className="w-5 h-5 text-rose-400" />
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Tổng COD hợp lệ</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-amber-400 font-mono">
                  {totalCodSum.toLocaleString('vi-VN')} đ
                </span>
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${statusFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                Tất cả ({totalCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('VALID')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${statusFilter === 'VALID'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                Hợp Lệ ({validCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('INVALID')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${statusFilter === 'INVALID'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
              >
                Lỗi Cấu Trúc ({invalidCount})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên, SĐT, mã ĐH..."
                  className="w-full glass-input rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 bg-slate-900 border border-slate-800 outline-none"
                />
              </div>

              {invalidCount > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllInvalid}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa Dòng Lỗi ({invalidCount})
                </button>
              )}
            </div>
          </div>

          {/* Interactive Batch Preview Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4 w-28">Trạng Thái</th>
                    <th className="py-3 px-4">Người Nhận & SĐT</th>
                    <th className="py-3 px-4">Địa Chỉ Giao Hàng</th>
                    <th className="py-3 px-4">Sản Phẩm & KL / DIM</th>
                    <th className="py-3 px-4 text-right">COD / Giá Trị</th>
                    <th className="py-3 px-4 text-center w-28">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Không tìm thấy đơn hàng nào khớp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-800/40 transition ${!item.isValid ? 'bg-rose-950/10' : ''
                          }`}
                      >
                        <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                          #{item.rowIndex}
                        </td>

                        <td className="py-3 px-4">
                          {item.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Hợp Lệ
                            </span>
                          ) : (
                            <div className="group relative inline-block">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer">
                                <XCircle className="w-3 h-3" /> Lỗi ({item.errorMessages.length})
                              </span>
                              <div className="hidden group-hover:block absolute left-0 z-20 bottom-full mb-1 w-48 p-2 rounded-xl bg-slate-900 border border-rose-500/40 text-[11px] text-rose-300 shadow-2xl space-y-1">
                                {item.errorMessages.map((err, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <span>• {err}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{item.receiverName || '—'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.receiverPhone || '—'}</div>
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate">
                          <div className="text-slate-200 truncate">{item.detailAddress || '—'}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {item.ward}, {item.district}, {item.province}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-medium truncate max-w-xs">
                            {item.productName} (x{item.quantity})
                          </div>
                          <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                            <span>{item.weight} kg</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">
                              {item.length || 20}x{item.width || 15}x{item.height || 10} cm
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono">
                          <div className="font-bold text-amber-400">
                            {item.codAmount.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Hàng: {item.goodsValue.toLocaleString('vi-VN')} đ
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedItemForView(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                              title="Xem chi tiết đơn"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedItemForEdit(item)}
                              className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 transition cursor-pointer"
                              title="Sửa thông tin đơn này"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                              title="Xóa đơn khỏi danh sách"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-4 z-30 p-4 rounded-3xl glass-panel border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              {invalidCount > 0 ? (
                <div className="flex items-center gap-2 text-rose-400 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Có <strong>{invalidCount}</strong> đơn bị lỗi cấu trúc. Vui lòng sửa hoặc xóa để tiếp tục.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Tất cả <strong>{validCount}</strong> đơn hàng đều hợp lệ và sẵn sàng tạo vận đơn!
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleConfirmCreateBatch}
                disabled={validCount === 0 || creatingBatch}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl transition ${validCount > 0
                    ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-cyan-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
              >
                {creatingBatch ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang Tạo Hàng Loạt... ({creationProgress}%)
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" /> Xác Nhận Tạo {validCount} Đơn Hàng Hợp Lệ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>

      {/* MODAL 1: EDIT ROW FORM MODAL */}
      {selectedItemForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-400" /> Sửa Đơn Hàng Dòng #{selectedItemForEdit.rowIndex}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedItemForEdit(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Tên người nhận *</label>
                  <input
                    type="text"
                    value={selectedItemForEdit.receiverName}
                    onChange={(e) =>
                      setSelectedItemForEdit({ ...selectedItemForEdit, receiverName: e.target.value })
                    }
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white bg-slate-950 border border-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Số điện thoại *</label>
                  <input
                    type="text"
                    value={selectedItemForEdit.receiverPhone}
                    onChange={(e) =>
                      setSelectedItemForEdit({ ...selectedItemForEdit, receiverPhone: e.target.value })
                    }
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white font-mono bg-slate-950 border border-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Địa chỉ giao hàng chi tiết *</label>
                <input
                  type="text"
                  value={selectedItemForEdit.detailAddress}
                  onChange={(e) =>
                    setSelectedItemForEdit({ ...selectedItemForEdit, detailAddress: e.target.value })
                  }
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white bg-slate-950 border border-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Phường / Xã</label>
                  <input
                    type="text"
                    value={selectedItemForEdit.ward}
                    onChange={(e) =>
                      setSelectedItemForEdit({ ...selectedItemForEdit, ward: e.target.value })
                    }
                    className="w-full glass-input rounded-xl px-2.5 py-2 text-xs text-white bg-slate-950 border border-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Quận / Huyện</label>
                  <input
                    type="text"
                    value={selectedItemForEdit.district}
                    onChange={(e) =>
                      setSelectedItemForEdit({ ...selectedItemForEdit, district: e.target.value })
                    }
                    className="w-full glass-input rounded-xl px-2.5 py-2 text-xs text-white bg-slate-950 border border-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Tỉnh / TP *</label>
                  <input
                    type="text"
                    value={selectedItemForEdit.province}
                    onChange={(e) =>
                      setSelectedItemForEdit({ ...selectedItemForEdit, province: e.target.value })
                    }
                    className="w-full glass-input rounded-xl px-2.5 py-2 text-xs text-white bg-slate-950 border border-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1 font-semibold">Tên sản phẩm *</label>
                  <input
                    type="text"
                    value={selectedItemForEdit.productName}
                    onChange={(e) =>
                      setSelectedItemForEdit({ ...selectedItemForEdit, productName: e.target.value })
                    }
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white bg-slate-950 border border-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Trọng lượng (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedItemForEdit.weight}
                    onChange={(e) =>
                      setSelectedItemForEdit({
                        ...selectedItemForEdit,
                        weight: parseFloat(e.target.value) || 0.1,
                      })
                    }
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white font-mono bg-slate-950 border border-slate-800 outline-none text-right"
                  />
                </div>
              </div>

              {/* Dimensions Input (Dài x Rộng x Cao) */}
              <div className="space-y-1">
                <label className="block text-slate-400 font-semibold flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" /> Kích thước 3 chiều Dài x Rộng x Cao (cm)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Dài (cm)</span>
                    <input
                      type="number"
                      value={selectedItemForEdit.length || 20}
                      onChange={(e) =>
                        setSelectedItemForEdit({
                          ...selectedItemForEdit,
                          length: parseFloat(e.target.value) || 20,
                        })
                      }
                      className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-white font-mono bg-slate-950 border border-slate-800 outline-none text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Rộng (cm)</span>
                    <input
                      type="number"
                      value={selectedItemForEdit.width || 15}
                      onChange={(e) =>
                        setSelectedItemForEdit({
                          ...selectedItemForEdit,
                          width: parseFloat(e.target.value) || 15,
                        })
                      }
                      className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-white font-mono bg-slate-950 border border-slate-800 outline-none text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Cao (cm)</span>
                    <input
                      type="number"
                      value={selectedItemForEdit.height || 10}
                      onChange={(e) =>
                        setSelectedItemForEdit({
                          ...selectedItemForEdit,
                          height: parseFloat(e.target.value) || 10,
                        })
                      }
                      className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-white font-mono bg-slate-950 border border-slate-800 outline-none text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Tiền COD (VNĐ)</label>
                  <input
                    type="text"
                    value={formatNumberWithDots(selectedItemForEdit.codAmount)}
                    onChange={(e) =>
                      setSelectedItemForEdit({
                        ...selectedItemForEdit,
                        codAmount: parseDotsToNumber(e.target.value),
                      })
                    }
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-amber-400 font-mono bg-slate-950 border border-slate-800 outline-none text-right font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Giá trị hàng (VNĐ)</label>
                  <input
                    type="text"
                    value={formatNumberWithDots(selectedItemForEdit.goodsValue)}
                    onChange={(e) =>
                      setSelectedItemForEdit({
                        ...selectedItemForEdit,
                        goodsValue: parseDotsToNumber(e.target.value),
                      })
                    }
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white font-mono bg-slate-950 border border-slate-800 outline-none text-right"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedItemForEdit(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditedItem(selectedItemForEdit)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Lưu & Cập Nhật Trạng Thái
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT ORDER DETAIL MODAL */}
      {selectedItemForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" /> Chi Tiết Đơn Dòng #{selectedItemForView.rowIndex}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedItemForView(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <User className="w-4 h-4 text-blue-400" /> {selectedItemForView.receiverName}
                </div>
                <div className="font-mono text-cyan-400">{selectedItemForView.receiverPhone}</div>
                <div className="text-slate-400">
                  {selectedItemForView.detailAddress}, {selectedItemForView.ward}, {selectedItemForView.district},{' '}
                  {selectedItemForView.province}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-bold text-white">{selectedItemForView.productName}</div>
                <div className="flex justify-between text-slate-400">
                  <span>Số lượng: {selectedItemForView.quantity}</span>
                  <span className="font-mono text-white">Trọng lượng thực: {selectedItemForView.weight} kg</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-900">
                  <span>Kích thước DIM:</span>
                  <span className="font-mono text-cyan-400">
                    {selectedItemForView.length || 20} x {selectedItemForView.width || 15} x{' '}
                    {selectedItemForView.height || 10} cm
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span>Tiền thu hộ COD:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {selectedItemForView.codAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Khai giá bảo hiểm:</span>
                  <span className="font-mono">
                    {selectedItemForView.goodsValue.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedItemForView(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FORMAT GUIDE MODAL */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <h3 className="text-base font-bold flex items-center gap-2 text-amber-400">
                <HelpCircle className="w-5 h-5" /> Hướng Dẫn Định Dạng & Cấu Trúc File Excel Chuẩn
              </h3>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-xs text-slate-300 overflow-y-auto pr-1 leading-relaxed flex-1">
              
              {/* Image Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Hình Ảnh Mẫu File Excel Nhập Đơn Hàng Hàng Loạt:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">13 Cột Chuẩn E-Logistics</span>
                </div>
                
                <div className="rounded-2xl border border-slate-700/80 overflow-hidden bg-slate-950 shadow-xl group relative">
                  <img
                    src="/excel_template_guide.png"
                    alt="File Excel Mẫu Chuẩn Định Dạng E-Logistics"
                    className="w-full object-contain max-h-56 bg-slate-950 transition-transform group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Real Excel Grid Replica */}
              <div className="space-y-2">
                <span className="font-bold text-slate-200 text-xs block">Bảng Chi Tiết Cấu Trúc Dữ Liệu Excel Mẫu:</span>
                <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-950/80">
                  <table className="w-full text-[11px] font-mono text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-center font-bold">
                        <th className="p-2 border-r border-slate-800 w-8 bg-slate-950 text-slate-500">#</th>
                        <th className="p-2 border-r border-slate-800">A (Mã ĐH Shop)</th>
                        <th className="p-2 border-r border-slate-800 text-rose-400">B (Họ Tên Nhận)*</th>
                        <th className="p-2 border-r border-slate-800 text-rose-400">C (Số Điện Thoại)*</th>
                        <th className="p-2 border-r border-slate-800 text-rose-400">D (Địa Chỉ Chi Tiết)*</th>
                        <th className="p-2 border-r border-slate-800">E (Phường Xã)</th>
                        <th className="p-2 border-r border-slate-800">F (Quận Huyện)</th>
                        <th className="p-2 border-r border-slate-800 text-rose-400">G (Tỉnh Thành)*</th>
                        <th className="p-2 border-r border-slate-800 text-rose-400">H (Sản Phẩm)*</th>
                        <th className="p-2 border-r border-slate-800">I (Số Lượng)</th>
                        <th className="p-2 border-r border-slate-800 text-rose-400">J (Trọng Lượng kg)*</th>
                        <th className="p-2 border-r border-slate-800">K (Tiền COD)</th>
                        <th className="p-2 border-r border-slate-800">L (Giá Trị Hàng)</th>
                        <th className="p-2">M (Ghi Chú)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr className="hover:bg-slate-900/50">
                        <td className="p-2 font-bold text-slate-500 bg-slate-950 text-center border-r border-slate-800">1</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Mã ĐH Shop</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Họ Tên Người Nhận</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Số Điện Thoại</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Địa Chỉ Chi Tiết</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Phường Xã</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Quận Huyện</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Tỉnh Thành</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Tên Sản Phẩm</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Số Lượng</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Trọng Lượng</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Tiền COD (VNĐ)</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-slate-400">Giá Trị Hàng</td>
                        <td className="p-2 font-bold text-slate-400">Ghi Chú Giao Hàng</td>
                      </tr>
                      <tr className="hover:bg-slate-900/50">
                        <td className="p-2 font-bold text-slate-500 bg-slate-950 text-center border-r border-slate-800">2</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-blue-400">DH-8801</td>
                        <td className="p-2 border-r border-slate-800 text-white font-bold">Nguyễn Văn An</td>
                        <td className="p-2 border-r border-slate-800">0912345678</td>
                        <td className="p-2 border-r border-slate-800">123 Nguyễn Trãi</td>
                        <td className="p-2 border-r border-slate-800">Phường 2</td>
                        <td className="p-2 border-r border-slate-800">Quận 5</td>
                        <td className="p-2 border-r border-slate-800">TP. Hồ Chí Minh</td>
                        <td className="p-2 border-r border-slate-800 text-emerald-400 font-semibold">Áo thun Polo Nam Premium</td>
                        <td className="p-2 border-r border-slate-800 text-center">2</td>
                        <td className="p-2 border-r border-slate-800 text-amber-400 font-bold">0.5</td>
                        <td className="p-2 border-r border-slate-800 text-emerald-400">350.000</td>
                        <td className="p-2 border-r border-slate-800 text-emerald-400">350.000</td>
                        <td className="p-2 text-slate-400">Cho xem hàng trước khi nhận</td>
                      </tr>
                      <tr className="hover:bg-slate-900/50">
                        <td className="p-2 font-bold text-slate-500 bg-slate-950 text-center border-r border-slate-800">3</td>
                        <td className="p-2 border-r border-slate-800 font-bold text-blue-400">DH-8802</td>
                        <td className="p-2 border-r border-slate-800 text-white font-bold">Trần Thị Bích</td>
                        <td className="p-2 border-r border-slate-800">0987654321</td>
                        <td className="p-2 border-r border-slate-800">456 Lê Duẩn</td>
                        <td className="p-2 border-r border-slate-800">Phường Bến Nghé</td>
                        <td className="p-2 border-r border-slate-800">Quận 1</td>
                        <td className="p-2 border-r border-slate-800">TP. Hồ Chí Minh</td>
                        <td className="p-2 border-r border-slate-800 text-emerald-400 font-semibold">Giày Sneakers Sport RunX</td>
                        <td className="p-2 border-r border-slate-800 text-center">1</td>
                        <td className="p-2 border-r border-slate-800 text-amber-400 font-bold">1.2</td>
                        <td className="p-2 border-r border-slate-800 text-emerald-400">520.000</td>
                        <td className="p-2 border-r border-slate-800 text-emerald-400">520.000</td>
                        <td className="p-2 text-slate-400">Gọi trước khi giao 15 phút</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Requirement Notes */}
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[11px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    <strong>Mẹo Wizard 4 Bước:</strong> Bạn có thể dùng bất kỳ file Excel báo cáo nào (có các dòng thông tin cửa hàng ở trên), Wizard sẽ hỗ trợ chọn dòng Tiêu Đề và dòng Bắt Đầu Dữ Liệu cực kỳ linh hoạt!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-bold shrink-0 cursor-pointer transition flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-cyan-300" /> Tải File Excel Mẫu
                </button>
              </div>

            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs border border-slate-700 transition flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Tải Mẫu Excel (.CSV)
              </button>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
              >
                Đã Hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BATCH CREATION SUCCESS MODAL */}
      {createdOrdersResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 space-y-5 text-white shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Tạo Đơn Hàng Loạt Thành Công!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Đã tạo thành công <strong className="text-emerald-400 font-mono text-sm">{createdOrdersResult.length}</strong> vận đơn mới vào hệ thống E-Logistics.
              </p>
            </div>

            <div className="max-h-40 overflow-y-auto bg-slate-950 rounded-2xl p-3 border border-slate-800 space-y-1 text-left">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Mã vận đơn đã sinh:</span>
              {createdOrdersResult.map((ord, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-mono py-0.5">
                  <span className="text-cyan-400 font-bold">{ord.trackingCode}</span>
                  <span className="text-slate-400">{ord.deliveryAddress?.fullName}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCreatedOrdersResult(null);
                  navigate('/seller/orders');
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer"
              >
                Quản Lý Danh Sách Đơn
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreatedOrdersResult(null);
                  setBatchItems([]);
                  setFileName(null);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Tải Thêm File Đơn Khác
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: 4-STEP EXCEL WIZARD MODAL */}
      <ExcelImportOrderModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setPendingWizardFile(null);
        }}
        initialFile={pendingWizardFile}
        onPreviewReady={handleModalPreviewReady}
        onSuccess={() => {
          setIsImportModalOpen(false);
          setPendingWizardFile(null);
          navigate('/seller/orders');
        }}
      />
    </>
  );
};

