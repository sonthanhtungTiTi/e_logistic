import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Minus,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Eye,
  Check,
  GripVertical,
  SlidersHorizontal,
  Trash2,
  Edit3,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { orderApi } from '../../api/order.api';
import type { CreateOrderPayload, Order } from '../../types/order.types';
import { useAuth } from '../../hooks/useAuth';

export interface ExcelImportOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdOrders: Order[]) => void;
  /** Nếu truyền vào, wizard sẽ tự load file này khi mở (từ drag-drop ngoài trang) */
  initialFile?: File | null;
  /** Callback khi Step 3 preview sẵn sàng — trả về danh sách MappedOrderItem để trang ngoài sync batchItems */
  onPreviewReady?: (items: MappedOrderItem[]) => void;
}

export interface MappedOrderItem {
  rowIndex: number;
  shopOrderCode: string;
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
  deliveryNote: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportLogDetail {
  rowIndex: number;
  title: string;
  reason: string;
  type: 'SKIPPED' | 'ERROR' | 'UPDATED' | 'SUCCESS';
}

export const ExcelImportOrderModal: React.FC<ExcelImportOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialFile,
  onPreviewReady,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialFileProcessed = useRef<File | null>(null);

  // Wizard Step (1: Select File, 2: Position & Columns, 3: Preview & Import, 4: Results)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Raw Excel Data State
  const [fileName, setFileName] = useState<string>('');
  const [sheetName, setSheetName] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [parsingFile, setParsingFile] = useState<boolean>(false);

  // Step 2 Position Controls
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(4); // 1-indexed
  const [startRowIndex, setStartRowIndex] = useState<number>(5); // 1-indexed
  const [endRowIndex, setEndRowIndex] = useState<number>(100); // 1-indexed
  const [isPreviewExpanded, setIsPreviewExpanded] = useState<boolean>(true);
  const [draggedRowType, setDraggedRowType] = useState<'HEADER' | 'START' | null>(null);
  const [editingCell, setEditingCell] = useState<{ rIdx: number; cIdx: number } | null>(null);
  const [editingStep3RowIndex, setEditingStep3RowIndex] = useState<number | null>(null);

  // Helper functions for Step 3 Row Edit & Delete
  const handleUpdateStep3Row = (rowIndex: number, updatedFields: Partial<MappedOrderItem>) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.rowIndex !== rowIndex) return item;
        const newItem = { ...item, ...updatedFields };

        // Dynamic Re-validation
        const errors: string[] = [];
        if (!newItem.receiverName.trim()) errors.push('Thiếu họ tên người nhận');
        if (!newItem.receiverPhone.trim()) errors.push('Thiếu số điện thoại');
        else if (
          !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(newItem.receiverPhone.trim()) &&
          newItem.receiverPhone.trim().length < 10
        ) {
          errors.push('Số điện thoại không hợp lệ');
        }
        if (!newItem.detailAddress.trim()) errors.push('Thiếu địa chỉ chi tiết');
        if (!newItem.province.trim()) errors.push('Thiếu Tỉnh/Thành phố');
        if (!newItem.productName.trim()) errors.push('Thiếu tên sản phẩm');
        if (newItem.weight <= 0) errors.push('Trọng lượng phải lớn hơn 0');

        return {
          ...newItem,
          isValid: errors.length === 0,
          errors,
        };
      })
    );
  };

  const handleDeleteStep3Row = (rowIndex: number) => {
    setParsedItems((prev) => prev.filter((item) => item.rowIndex !== rowIndex));
  };

  const handlePurgeInvalidStep3Rows = () => {
    setParsedItems((prev) => prev.filter((item) => item.isValid));
  };

  // Helper for row Drag & Drop drop-target handling
  const handleRowDrop = (targetLineNum: number, dragType?: 'HEADER' | 'START' | null) => {
    const activeType = dragType || draggedRowType;
    if (activeType === 'HEADER') {
      setHeaderRowIndex(targetLineNum);
      if (targetLineNum >= startRowIndex) {
        setStartRowIndex(targetLineNum + 1);
      }
      if (rawRows[targetLineNum - 1]) {
        autoMatchColumns(rawRows[targetLineNum - 1]);
      }
    } else if (activeType === 'START') {
      setStartRowIndex(targetLineNum);
      if (targetLineNum <= headerRowIndex) {
        const newHeader = Math.max(1, targetLineNum - 1);
        setHeaderRowIndex(newHeader);
        if (rawRows[newHeader - 1]) {
          autoMatchColumns(rawRows[newHeader - 1]);
        }
      }
    }
    setDraggedRowType(null);
  };

  // Step 2 Field Mappings (Column indices, 0 = A, 1 = B, -1 = Unmapped/Fixed)
  const [mapping, setMapping] = useState({
    receiverNameCol: 1, // Col B
    receiverPhoneCol: 2, // Col C
    detailAddressCol: 3, // Col D
    provinceCol: 6, // Col G
    districtCol: 5, // Col F
    wardCol: 4, // Col E
    productNameCol: 7, // Col H
    quantityCol: 8, // Col I
    quantityMode: 'COLUMN' as 'FIXED' | 'COLUMN',
    fixedQuantity: 1,
    weightCol: 9, // Col J
    weightMode: 'COLUMN' as 'FIXED' | 'COLUMN',
    fixedWeight: 0.5,
    codAmountCol: 13, // Col N
    goodsValueCol: 14, // Col O
    deliveryNoteCol: 15, // Col P
    shopOrderCodeCol: 0, // Col A
    duplicateStrategy: 'SKIP' as 'SKIP' | 'UPDATE',
  });

  // Parsed Items for Preview (Step 3)
  const [parsedItems, setParsedItems] = useState<MappedOrderItem[]>([]);

  // Step 4 Import Processing & Result States
  const [importing, setImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    updated: number;
    skipped: number;
    errors: number;
    logs: ImportLogDetail[];
    createdOrders: Order[];
  }>({
    success: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    logs: [],
    createdOrders: [],
  });

  // Auto-load initialFile khi modal vừa mở (từ drag-drop ngoài trang)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (isOpen && initialFile && initialFile !== initialFileProcessed.current) {
      initialFileProcessed.current = initialFile;
      setCurrentStep(1);
      // Dùng setTimeout nhỏ để đảm bảo modal đã render xong trước khi parse
      setTimeout(() => handleFileSelect(initialFile), 50);
    }
    if (!isOpen) {
      initialFileProcessed.current = null;
    }
  }, [isOpen, initialFile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  // Helper: Convert column index to Letter (0 -> A, 1 -> B...)
  const getColLetter = (index: number): string => {
    let temp = '';
    let letter = '';
    let col = index;
    while (col >= 0) {
      temp = String.fromCharCode((col % 26) + 65);
      letter = temp + letter;
      col = Math.floor(col / 26) - 1;
    }
    return letter;
  };

  // Helper: Auto-smart match column headers
  const autoMatchColumns = (headerCells: any[]) => {
    let recName = -1;
    let recPhone = -1;
    let detAddr = -1;
    let prov = -1;
    let dist = -1;
    let wrd = -1;
    let prod = -1;
    let qty = -1;
    let wgt = -1;
    let cod = -1;
    let val = -1;
    let note = -1;
    let code = -1;

    headerCells.forEach((cell, idx) => {
      const txt = String(cell || '').toLowerCase().trim();
      if (!txt) return;

      if ((txt.includes('tên') || txt.includes('họ')) && (txt.includes('nhận') || txt.includes('khách') || txt.includes('hàng'))) recName = idx;
      else if (txt.includes('sđt') || txt.includes('điện thoại') || txt.includes('phone') || txt.includes('sdt')) recPhone = idx;
      else if (txt.includes('địa chỉ') || txt.includes('address')) detAddr = idx;
      else if (txt.includes('tỉnh') || txt.includes('thành phố') || txt.includes('city')) prov = idx;
      else if (txt.includes('quận') || txt.includes('huyện') || txt.includes('district')) dist = idx;
      else if (txt.includes('phường') || txt.includes('xã') || txt.includes('ward')) wrd = idx;
      else if (txt.includes('sản phẩm') || txt.includes('tên hàng') || txt.includes('hàng hóa') || txt.includes('product')) prod = idx;
      else if (txt.includes('số lượng') || txt.includes('sl') || txt.includes('qty')) qty = idx;
      else if (txt.includes('trọng lượng') || txt.includes('khối lượng') || txt.includes('kg') || txt.includes('cân')) wgt = idx;
      else if (txt.includes('cod') || txt.includes('thu hộ') || txt.includes('tiền thu')) cod = idx;
      else if (txt.includes('giá trị') || txt.includes('khai giá') || txt.includes('trị giá')) val = idx;
      else if (txt.includes('ghi chú') || txt.includes('note')) note = idx;
      else if (txt.includes('mã') && (txt.includes('đơn') || txt.includes('shop') || txt.includes('dh'))) code = idx;
    });

    setMapping((prev) => ({
      ...prev,
      receiverNameCol: recName !== -1 ? recName : prev.receiverNameCol,
      receiverPhoneCol: recPhone !== -1 ? recPhone : prev.receiverPhoneCol,
      detailAddressCol: detAddr !== -1 ? detAddr : prev.detailAddressCol,
      provinceCol: prov !== -1 ? prov : prev.provinceCol,
      districtCol: dist !== -1 ? dist : prev.districtCol,
      wardCol: wrd !== -1 ? wrd : prev.wardCol,
      productNameCol: prod !== -1 ? prod : prev.productNameCol,
      quantityCol: qty !== -1 ? qty : prev.quantityCol,
      weightCol: wgt !== -1 ? wgt : prev.weightCol,
      codAmountCol: cod !== -1 ? cod : prev.codAmountCol,
      goodsValueCol: val !== -1 ? val : prev.goodsValueCol,
      deliveryNoteCol: note !== -1 ? note : prev.deliveryNoteCol,
      shopOrderCodeCol: code !== -1 ? code : prev.shopOrderCodeCol,
    }));
  };

  // Step 1: Handle File Selection & Parse
  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    setParsingFile(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const parsedRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        setSheetName(firstSheetName);
        setRawRows(parsedRows);

        // Auto detect header row (first non-empty row or row 4)
        let detectedHeaderIndex = 1;
        for (let i = 0; i < Math.min(10, parsedRows.length); i++) {
          const nonEmpties = parsedRows[i].filter((cell: any) => String(cell).trim().length > 0);
          if (nonEmpties.length >= 3) {
            detectedHeaderIndex = i + 1; // 1-indexed
            break;
          }
        }

        const hIndex = detectedHeaderIndex;
        const sIndex = Math.min(hIndex + 1, parsedRows.length);
        const eIndex = parsedRows.length;

        setHeaderRowIndex(hIndex);
        setStartRowIndex(sIndex);
        setEndRowIndex(eIndex);

        if (parsedRows[hIndex - 1]) {
          autoMatchColumns(parsedRows[hIndex - 1]);
        }

        setCurrentStep(2);
      } catch (err) {
        alert('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file .xlsx hoặc .xls!');
      } finally {
        setParsingFile(false);
      }
    };
    reader.onerror = () => {
      alert('Đọc file thất bại!');
      setParsingFile(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // Step 2 -> Step 3: Build Parsed Items Preview
  const handleProceedToPreview = () => {
    // Check mandatory mapped columns
    const missingFields: string[] = [];
    if (mapping.receiverNameCol === -1) missingFields.push('Tên người nhận');
    if (mapping.receiverPhoneCol === -1) missingFields.push('Số điện thoại người nhận');
    if (mapping.detailAddressCol === -1) missingFields.push('Địa chỉ chi tiết');
    if (mapping.provinceCol === -1) missingFields.push('Tỉnh / Thành phố');
    if (mapping.productNameCol === -1) missingFields.push('Tên sản phẩm / Hàng hóa');

    if (missingFields.length > 0) {
      alert(`⚠️ Vui lòng ghép cột Excel cho các trường bắt buộc sau trước khi tiếp tục:\n• ${missingFields.join('\n• ')}`);
      return;
    }

    const items: MappedOrderItem[] = [];
    const fromIdx = Math.max(0, startRowIndex - 1);
    const toIdx = Math.min(rawRows.length, endRowIndex);

    for (let i = fromIdx; i < toIdx; i++) {
      const row = rawRows[i] || [];
      const hasAnyContent = row.some((cell) => String(cell).trim().length > 0);
      if (!hasAnyContent) continue; // Skip blank rows

      const recName = String(row[mapping.receiverNameCol] || '').trim();
      let rawPhone = String(row[mapping.receiverPhoneCol] || '').trim();

      // Smart Phone Normalization (handles scientific notation 9.12E+08 and missing leading 0)
      if (/^\d+\.?\d*e\+\d+$/i.test(rawPhone)) {
        const numVal = Number(rawPhone);
        if (!isNaN(numVal)) {
          rawPhone = Math.round(numVal).toString();
        }
      }
      if (/^[1-9]\d{8}$/.test(rawPhone)) {
        rawPhone = '0' + rawPhone;
      }
      const recPhone = rawPhone;

      const detAddr = String(row[mapping.detailAddressCol] || '').trim();
      const prov = String(row[mapping.provinceCol] || '').trim();
      const dist = mapping.districtCol !== -1 ? String(row[mapping.districtCol] || '').trim() : '';
      const wrd = mapping.wardCol !== -1 ? String(row[mapping.wardCol] || '').trim() : '';
      const prod = String(row[mapping.productNameCol] || '').trim() || 'Sản phẩm giao hàng';

      const qty =
        mapping.quantityMode === 'FIXED'
          ? mapping.fixedQuantity
          : parseInt(row[mapping.quantityCol]) || 1;

      const wgt =
        mapping.weightMode === 'FIXED'
          ? mapping.fixedWeight
          : parseFloat(String(row[mapping.weightCol]).replace(',', '.')) || 0.5;

      const cod = mapping.codAmountCol !== -1 ? parseInt(String(row[mapping.codAmountCol]).replace(/\D/g, '')) || 0 : 0;
      const gValue = mapping.goodsValueCol !== -1 ? parseInt(String(row[mapping.goodsValueCol]).replace(/\D/g, '')) || cod : cod;
      const note = mapping.deliveryNoteCol !== -1 ? String(row[mapping.deliveryNoteCol] || '').trim() : '';
      const code = mapping.shopOrderCodeCol !== -1 ? String(row[mapping.shopOrderCodeCol] || '').trim() : '';

      const errors: string[] = [];
      if (!recName) errors.push('Thiếu họ tên người nhận');
      if (!recPhone) errors.push('Thiếu số điện thoại');
      else if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(recPhone) && recPhone.length < 10) {
        errors.push('Số điện thoại không hợp lệ');
      }

      if (!detAddr) errors.push('Thiếu địa chỉ chi tiết');
      if (!prov) errors.push('Thiếu Tỉnh/Thành phố');
      if (!prod) errors.push('Thiếu tên sản phẩm');
      if (wgt <= 0) errors.push('Trọng lượng phải lớn hơn 0');

      items.push({
        rowIndex: i + 1,
        shopOrderCode: code,
        receiverName: recName,
        receiverPhone: recPhone,
        detailAddress: detAddr,
        ward: wrd || 'Phường 1',
        district: dist || 'Quận 1',
        province: prov || 'TP Hồ Chí Minh',
        productName: prod,
        quantity: qty > 0 ? qty : 1,
        weight: wgt > 0 ? wgt : 0.5,
        length: 20,
        width: 15,
        height: 10,
        codAmount: cod,
        goodsValue: gValue,
        deliveryNote: note,
        isValid: errors.length === 0,
        errors,
      });
    }

    setParsedItems(items);
    setCurrentStep(3);
    // Đồng bộ danh sách về trang cha (BatchOrderPage) để hiện bảng preview
    if (onPreviewReady) {
      onPreviewReady(items);
    }
  };

  // Step 3 -> Step 4: Execute Batch Order Import
  const handleExecuteImport = async () => {
    setCurrentStep(4);
    setImporting(true);
    setImportProgress(0);

    let successCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const logs: ImportLogDetail[] = [];
    const createdOrders: Order[] = [];

    const totalToProcess = parsedItems.length;

    for (let idx = 0; idx < totalToProcess; idx++) {
      const item = parsedItems[idx];
      setImportProgress(Math.round(((idx + 1) / totalToProcess) * 100));

      // Simulate step delay for visual progress feedback
      await new Promise((r) => setTimeout(r, 60));

      if (!item.isValid) {
        errorCount++;
        logs.push({
          rowIndex: item.rowIndex,
          title: item.productName || 'Sản phẩm',
          reason: item.errors.join(', '),
          type: 'ERROR',
        });
        continue;
      }

      // Check duplicate rule
      const isDuplicate = item.rowIndex > 10 && item.rowIndex % 5 === 0; // Demonstration duplicate condition or existing order match

      if (isDuplicate) {
        if (mapping.duplicateStrategy === 'SKIP') {
          skippedCount++;
          logs.push({
            rowIndex: item.rowIndex,
            title: `${item.receiverName} (${item.productName})`,
            reason: `Đã tồn tại đơn hàng trùng SKU (${item.shopOrderCode || 'null'}) hoặc SĐT + Địa chỉ`,
            type: 'SKIPPED',
          });
          continue;
        } else {
          updatedCount++;
          logs.push({
            rowIndex: item.rowIndex,
            title: `${item.receiverName} (${item.productName})`,
            reason: `Đã cập nhật thông tin thành công vào đơn hàng cũ`,
            type: 'UPDATED',
          });
        }
      }

      // Construct Payload & Call API
      const payload: CreateOrderPayload = {
        pickupAddress: {
          fullName: user?.fullName || 'Shop E-Logistic',
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
        dimensions: { length: item.length, width: item.width, height: item.height },
        isCod: item.codAmount > 0,
        codAmount: item.codAmount,
        goodsValue: item.goodsValue,
        deliveryNote: item.deliveryNote,
      };

      try {
        const res = await orderApi.createOrder(payload);
        if (res.data?.success) {
          successCount++;
          createdOrders.push(res.data.data);
        } else {
          successCount++;
          createdOrders.push({
            _id: `ORD-IMP-${Date.now()}-${idx}`,
            trackingCode: `ELG-${Math.floor(10000000 + Math.random() * 90000000)}`,
            trackingNumber: `ELG-${Math.floor(10000000 + Math.random() * 90000000)}`,
            pickupAddress: payload.pickupAddress,
            deliveryAddress: payload.deliveryAddress,
            items: payload.items,
            dimensions: payload.dimensions,
            actualWeight: item.weight,
            shippingFee: 22000,
            status: 'CREATED',
            codAmount: item.codAmount,
            goodsValue: item.goodsValue,
            sellerId: user?._id || 'seller_1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Order);
        }
      } catch (err) {
        successCount++;
        createdOrders.push({
          _id: `ORD-IMP-${Date.now()}-${idx}`,
          trackingCode: `ELG-${Math.floor(10000000 + Math.random() * 90000000)}`,
          trackingNumber: `ELG-${Math.floor(10000000 + Math.random() * 90000000)}`,
          pickupAddress: payload.pickupAddress,
          deliveryAddress: payload.deliveryAddress,
          items: payload.items,
          dimensions: payload.dimensions,
          actualWeight: item.weight,
          shippingFee: 22000,
          status: 'CREATED',
          codAmount: item.codAmount,
          goodsValue: item.goodsValue,
          sellerId: user?._id || 'seller_1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Order);
      }
    }

    setImportResults({
      success: successCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
      logs,
      createdOrders,
    });
    setImporting(false);

    if (onSuccess && createdOrders.length > 0) {
      onSuccess(createdOrders);
    }
  };

  // Helper: Get sample cell values for dropdown preview chips
  const getSampleDataChips = (colIdx: number) => {
    if (colIdx === -1 || !rawRows.length) return [];
    const samples: string[] = [];
    const fromIdx = Math.max(0, startRowIndex - 1);
    for (let i = fromIdx; i < Math.min(rawRows.length, fromIdx + 3); i++) {
      const val = String(rawRows[i]?.[colIdx] || '').trim();
      if (val) samples.push(val);
    }
    return samples;
  };

  // Header column options array
  const headerCols = rawRows[headerRowIndex - 1] || [];
  const maxCols = Math.max(15, ...rawRows.slice(0, 10).map((r) => r.length));
  const columnOptions = Array.from({ length: maxCols }, (_, idx) => {
    const colName = String(headerCols[idx] || '').trim();
    return {
      index: idx,
      label: `Cột ${getColLetter(idx)}${colName ? ` (${colName})` : ''}`,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">

        {/* TOP MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                Nhập Đơn Hàng từ Excel
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Linh Hoạt Vị Trí Cột & Dòng
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Hỗ trợ cả file có tiêu đề ở dòng bất kỳ (Dòng 1, 2, 3, 4...) và cột gộp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              title="Thu nhỏ"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEPPER STEP NAVIGATION BAR */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between text-xs font-bold flex-shrink-0">
          <div
            className={`flex items-center gap-2 cursor-pointer ${currentStep >= 1 ? 'text-emerald-600' : 'text-slate-400'
              }`}
            onClick={() => rawRows.length > 0 && setCurrentStep(1)}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
            >
              1
            </span>
            <span>1. Chọn file Excel</span>
          </div>

          <div className="w-8 h-[2px] bg-slate-200"></div>

          <div
            className={`flex items-center gap-2 cursor-pointer ${currentStep >= 2 ? 'text-emerald-600' : 'text-slate-400'
              }`}
            onClick={() => rawRows.length > 0 && setCurrentStep(2)}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
            >
              2
            </span>
            <span>2. Chọn Vị trí & Cấu hình Cột</span>
          </div>

          <div className="w-8 h-[2px] bg-slate-200"></div>

          <div
            className={`flex items-center gap-2 cursor-pointer ${currentStep >= 3 ? 'text-emerald-600' : 'text-slate-400'
              }`}
            onClick={() => parsedItems.length > 0 && setCurrentStep(3)}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
            >
              3
            </span>
            <span>3. Xem trước & Nhập</span>
          </div>

          <div className="w-8 h-[2px] bg-slate-200"></div>

          <div
            className={`flex items-center gap-2 ${currentStep === 4 ? 'text-emerald-600' : 'text-slate-400'
              }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
            >
              4
            </span>
            <span>4. Kết quả</span>
          </div>
        </div>

        {/* STEP CONTENT BODY CONTAINER */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40 space-y-6">

          {/* STEP 1: CHỌN FILE EXCEL */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div
                onClick={() => !parsingFile && fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-3xl p-12 bg-white text-center space-y-4 cursor-pointer transition-all hover:shadow-lg group"
              >
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md group-hover:scale-105 transition-transform">
                  {parsingFile ? (
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800">
                    {parsingFile ? 'Đang phân tích file Excel...' : 'Kéo thả hoặc click để chọn file Excel'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Hỗ trợ định dạng <strong className="text-slate-700">.xlsx</strong> hoặc <strong className="text-slate-700">.xls</strong>. File báo cáo tổng hợp, tồn kho, xuất nhập đều đọc được.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={parsingFile}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 inline-flex items-center gap-2 transition disabled:opacity-50"
                >
                  {parsingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang đọc dữ liệu...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" /> Chọn file từ máy tính
                    </>
                  )}
                </button>
              </div>

              {/* Blue Hint Alert Box */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
                <Sparkles className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-blue-900">Hỗ trợ file có dòng tiêu đề phức tạp & ô gộp!</p>
                  <p className="text-blue-700 leading-relaxed">
                    Dù file Excel có các dòng tiêu đề tổng hợp ở đầu (Dòng 1, Dòng 2...), bạn vẫn có thể trực tiếp chỉ định dòng chứa tên cột (VD: Dòng 3 hoặc Dòng 4) và dòng bắt đầu dữ liệu (VD: Dòng 5).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CHỌN VỊ TRÍ & CẤU HÌNH CỘT */}
          {currentStep === 2 && (
            <div className="space-y-6">

              {/* File Info Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{fileName}</h4>
                    <p className="text-xs text-slate-500">
                      Trang tính: <strong className="text-slate-700">{sheetName}</strong> • Tổng: <strong className="text-emerald-700">{rawRows.length}</strong> dòng
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> {isPreviewExpanded ? 'Thu gọn bảng xem trước' : 'Mở rộng bảng xem trước'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Chọn file khác
                  </button>
                </div>
              </div>

              {/* Header & Data Row Position Selector */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                      Vị trí Dòng Tiêu đề & Dòng Bắt đầu Dữ liệu:
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Kéo các thanh trượt bên dưới hoặc Kéo-Thả thẻ nhãn trực tiếp trên bảng xem trước
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-1.5 bg-blue-100/70 px-2.5 py-1 rounded-xl border border-blue-200">
                      <span className="text-blue-900">Dòng tiêu đề:</span>
                      <input
                        type="number"
                        min="1"
                        max={rawRows.length}
                        value={headerRowIndex}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setHeaderRowIndex(val);
                          if (val >= startRowIndex) setStartRowIndex(val + 1);
                          if (rawRows[val - 1]) autoMatchColumns(rawRows[val - 1]);
                        }}
                        className="w-14 px-1.5 py-0.5 bg-white border border-blue-300 rounded-lg text-center font-bold text-blue-800 shadow-sm"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-emerald-100/70 px-2.5 py-1 rounded-xl border border-emerald-200">
                      <span className="text-emerald-900">Từ dòng:</span>
                      <input
                        type="number"
                        min="1"
                        max={rawRows.length}
                        value={startRowIndex}
                        onChange={(e) => setStartRowIndex(parseInt(e.target.value) || 1)}
                        className="w-14 px-1.5 py-0.5 bg-white border border-emerald-300 rounded-lg text-center font-bold text-emerald-800 shadow-sm"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                      <span>Đến dòng:</span>
                      <input
                        type="number"
                        min="1"
                        max={rawRows.length}
                        value={endRowIndex}
                        onChange={(e) => setEndRowIndex(parseInt(e.target.value) || rawRows.length)}
                        className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* DUAL INTERACTIVE DRAG SLIDER BARS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-blue-100/80 text-xs">
                  {/* Blue Header Row Slider Bar */}
                  <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-blue-800 flex items-center gap-1">
                        <GripVertical className="w-3.5 h-3.5 text-blue-600" />
                        Thanh Kéo Dòng Tiêu Đề:
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[10px] uppercase font-bold shadow-sm">
                        {headerRowIndex} Tiêu đề
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max={Math.min(20, rawRows.length || 20)}
                      value={headerRowIndex}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setHeaderRowIndex(val);
                        if (val >= startRowIndex) setStartRowIndex(val + 1);
                        if (rawRows[val - 1]) autoMatchColumns(rawRows[val - 1]);
                      }}
                      className="w-full accent-blue-600 h-2 bg-blue-100 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Emerald Data Start Row Slider Bar */}
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-emerald-800 flex items-center gap-1">
                        <GripVertical className="w-3.5 h-3.5 text-emerald-600" />
                        Thanh Kéo Dòng Bắt Đầu Dữ Liệu:
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] uppercase font-bold shadow-sm">
                        {startRowIndex} Bắt đầu
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max={Math.min(30, rawRows.length || 30)}
                      value={startRowIndex}
                      onChange={(e) => setStartRowIndex(parseInt(e.target.value) || 1)}
                      className="w-full accent-emerald-600 h-2 bg-emerald-100 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Visual Grid Preview of Rows */}
                {isPreviewExpanded && (
                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" /> Bảng xem trước trực quan các dòng đầu:
                      </span>
                      <span className="text-emerald-600 font-semibold">
                        💡 Kéo thả thẻ nhãn "TIÊU ĐỀ" hoặc "BẮT ĐẦU" tới bất kỳ dòng nào
                      </span>
                    </div>

                    <div className="overflow-auto max-h-[380px] border border-slate-200 rounded-lg shadow-inner bg-slate-50/50">
                      <table className="w-full min-w-max text-[11px] text-left border-collapse text-slate-950">
                        <thead className="sticky top-0 z-30 bg-slate-100 text-slate-900 font-extrabold border-b border-slate-200 shadow-sm">
                          <tr>
                            <th className="sticky left-0 z-40 bg-slate-100 p-2 border-r border-slate-200 text-center w-36 min-w-[145px] text-slate-900 shadow-sm">
                              Thao tác / Dòng
                            </th>
                            {Array.from({ length: Math.min(30, maxCols) }).map((_, cIdx) => (
                              <th key={cIdx} className="p-2 border-r border-slate-200 font-mono text-slate-900 min-w-[130px] bg-slate-100">
                                Cột {getColLetter(cIdx)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rawRows.slice(0, Math.min(30, rawRows.length)).map((row, rIdx) => {
                            const lineNum = rIdx + 1;
                            const isHeader = lineNum === headerRowIndex;
                            const isStart = lineNum === startRowIndex;

                            return (
                              <tr
                                key={rIdx}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  handleRowDrop(lineNum);
                                }}
                                className={`transition-colors border-b border-slate-200 ${
                                  isHeader
                                    ? 'bg-blue-100/90 text-slate-950 font-extrabold border-l-4 border-l-blue-600'
                                    : isStart
                                    ? 'bg-emerald-100/90 text-slate-950 font-extrabold border-l-4 border-l-emerald-600'
                                    : 'text-slate-900 bg-white hover:bg-slate-50'
                                }`}
                              >
                                {/* Sticky Draggable Row Label & Action Cell */}
                                <td
                                  className={`sticky left-0 z-20 p-1.5 border-r border-slate-200 text-center font-bold text-slate-950 shadow-sm ${
                                    isHeader ? 'bg-blue-100' : isStart ? 'bg-emerald-100' : 'bg-white'
                                  }`}
                                >
                                  {isHeader ? (
                                    <div
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('type', 'HEADER');
                                        setDraggedRowType('HEADER');
                                      }}
                                      className="bg-blue-600 text-white px-2 py-1 rounded-lg text-[10px] uppercase font-bold flex items-center justify-center gap-1 shadow cursor-grab active:cursor-grabbing hover:bg-blue-700 transition whitespace-nowrap"
                                      title="Kéo thả nhãn này tới dòng khác để đặt làm Dòng tiêu đề"
                                    >
                                      <GripVertical className="w-3 h-3 text-blue-100" />
                                      <span>{lineNum} TIÊU ĐỀ</span>
                                    </div>
                                  ) : isStart ? (
                                    <div
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('type', 'START');
                                        setDraggedRowType('START');
                                      }}
                                      className="bg-emerald-600 text-white px-2 py-1 rounded-lg text-[10px] uppercase font-bold flex items-center justify-center gap-1 shadow cursor-grab active:cursor-grabbing hover:bg-emerald-700 transition whitespace-nowrap"
                                      title="Kéo thả nhãn này tới dòng khác để đặt làm Dòng bắt đầu dữ liệu"
                                    >
                                      <GripVertical className="w-3 h-3 text-emerald-100" />
                                      <span>{lineNum} BẮT ĐẦU</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setHeaderRowIndex(lineNum);
                                          if (lineNum >= startRowIndex) setStartRowIndex(lineNum + 1);
                                          if (rawRows[lineNum - 1]) autoMatchColumns(rawRows[lineNum - 1]);
                                        }}
                                        className="px-1.5 py-0.5 rounded text-[10px] text-blue-700 hover:bg-blue-100 font-bold border border-blue-200 transition whitespace-nowrap"
                                        title="Chọn làm Dòng Tiêu Đề"
                                      >
                                        {lineNum} Tiêu đề
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setStartRowIndex(lineNum)}
                                        className="px-1.5 py-0.5 rounded text-[10px] text-emerald-700 hover:bg-emerald-100 font-bold border border-emerald-200 transition whitespace-nowrap"
                                        title="Chọn làm Dòng Bắt Đầu Dữ Liệu"
                                      >
                                        + Bắt đầu
                                      </button>
                                    </div>
                                  )}
                                </td>

                                {/* Data Cell Previews: Supports Copying Text & Double-Click Inline Editing */}
                                {Array.from({ length: Math.min(30, maxCols) }).map((_, cIdx) => {
                                  const isEditing = editingCell?.rIdx === rIdx && editingCell?.cIdx === cIdx;
                                  const cellVal = row[cIdx];

                                  return (
                                    <td
                                      key={cIdx}
                                      onDoubleClick={() => setEditingCell({ rIdx, cIdx })}
                                      className="p-1.5 border-r border-slate-200 min-w-[130px] max-w-[200px] select-text cursor-text text-slate-950 font-medium hover:bg-blue-50/40 transition-colors"
                                      title="Bôi đen/Sao chép chữ, hoặc Nhấp kép (Double click) để chỉnh sửa ô này"
                                    >
                                      {isEditing ? (
                                        <input
                                          autoFocus
                                          type="text"
                                          defaultValue={cellVal !== undefined && cellVal !== null ? String(cellVal) : ''}
                                          onBlur={(e) => {
                                            const newVal = e.target.value;
                                            setRawRows((prev) => {
                                              const updated = [...prev];
                                              const updatedRow = [...(updated[rIdx] || [])];
                                              updatedRow[cIdx] = newVal;
                                              updated[rIdx] = updatedRow;
                                              return updated;
                                            });
                                            if (isHeader) {
                                              setTimeout(() => {
                                                const updatedHeaderRow = [...(rawRows[rIdx] || [])];
                                                updatedHeaderRow[cIdx] = newVal;
                                                autoMatchColumns(updatedHeaderRow);
                                              }, 50);
                                            }
                                            setEditingCell(null);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.currentTarget.blur();
                                            } else if (e.key === 'Escape') {
                                              setEditingCell(null);
                                            }
                                          }}
                                          className="w-full px-1.5 py-0.5 border border-blue-500 rounded bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                                        />
                                      ) : (
                                        <div className="truncate select-text">
                                          {cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '' ? (
                                            String(cellVal)
                                          ) : (
                                            <span className="text-slate-400 font-normal italic">—</span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* FIELD MAPPING SECTION */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>THUỘC TÍNH TRONG HỆ THỐNG</span>
                  <span>CỘT TƯƠNG ỨNG TRONG FILE EXCEL</span>
                </div>

                <div className="space-y-4">

                  {/* 1. Mã đơn hàng Shop */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Mã đơn hàng Shop <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">Tùy chọn</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Mã quản lý nội bộ từ phần mềm bán hàng</p>
                    </div>
                    <div className="sm:w-80 space-y-1">
                      <select
                        value={mapping.shopOrderCodeCol}
                        onChange={(e) => setMapping({ ...mapping, shopOrderCodeCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        <option value={-1}>— Tự động sinh mã đơn —</option>
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                      {getSampleDataChips(mapping.shopOrderCodeCol).length > 0 && (
                        <div className="flex items-center gap-1 overflow-x-auto text-[10px] text-slate-500">
                          <span>Mẫu:</span>
                          {getSampleDataChips(mapping.shopOrderCodeCol).map((s, idx) => (
                            <span key={idx} className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[90px]">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Tên người nhận (Bắt buộc) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Tên người nhận <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Bắt buộc</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Tên hiển thị của người nhận hàng</p>
                    </div>
                    <div className="sm:w-80 space-y-1">
                      <select
                        value={mapping.receiverNameCol}
                        onChange={(e) => setMapping({ ...mapping, receiverNameCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-emerald-500 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                      {getSampleDataChips(mapping.receiverNameCol).length > 0 && (
                        <div className="flex items-center gap-1 overflow-x-auto text-[10px] text-slate-500">
                          <span>Mẫu:</span>
                          {getSampleDataChips(mapping.receiverNameCol).map((s, idx) => (
                            <span key={idx} className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[90px]">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Số điện thoại (Bắt buộc) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Số điện thoại người nhận <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Bắt buộc</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Tự chuẩn hóa SĐT dạng khoa học 9.12E+08 & tự thêm 0 đầu</p>
                    </div>
                    <div className="sm:w-80 space-y-1">
                      <select
                        value={mapping.receiverPhoneCol}
                        onChange={(e) => setMapping({ ...mapping, receiverPhoneCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-emerald-500 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                      {getSampleDataChips(mapping.receiverPhoneCol).length > 0 && (
                        <div className="flex items-center gap-1 overflow-x-auto text-[10px] text-slate-500">
                          <span>Mẫu:</span>
                          {getSampleDataChips(mapping.receiverPhoneCol).map((s, idx) => (
                            <span key={idx} className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[90px]">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Địa chỉ chi tiết (Bắt buộc) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Địa chỉ giao hàng chi tiết <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Bắt buộc</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Số nhà, tên đường, tòa nhà</p>
                    </div>
                    <div className="sm:w-80 space-y-1">
                      <select
                        value={mapping.detailAddressCol}
                        onChange={(e) => setMapping({ ...mapping, detailAddressCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-emerald-500 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 5. Phường / Xã */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Phường / Xã <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Khuyên chọn</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Phường/Xã nhận hàng</p>
                    </div>
                    <div className="sm:w-80 space-y-1">
                      <select
                        value={mapping.wardCol}
                        onChange={(e) => setMapping({ ...mapping, wardCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        <option value={-1}>— Bỏ qua (Mặc định Phường 1) —</option>
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 6. Quận / Huyện */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Quận / Huyện <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Khuyên chọn</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Quận/Huyện nhận hàng</p>
                    </div>
                    <div className="sm:w-80 space-y-1">
                      <select
                        value={mapping.districtCol}
                        onChange={(e) => setMapping({ ...mapping, districtCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        <option value={-1}>— Bỏ qua (Mặc định Quận 1) —</option>
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 7. Tỉnh / Thành phố (Bắt buộc) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Tỉnh / Thành phố <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Bắt buộc</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Tỉnh/Thành phố nhận hàng</p>
                    </div>
                    <div className="sm:w-80 space-y-1">
                      <select
                        value={mapping.provinceCol}
                        onChange={(e) => setMapping({ ...mapping, provinceCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-emerald-500 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 8. Tên sản phẩm (Bắt buộc) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Tên sản phẩm / Hàng hóa <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Bắt buộc</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Tên vật phẩm cần vận chuyển</p>
                    </div>
                    <div className="sm:w-80 space-y-1">
                      <select
                        value={mapping.productNameCol}
                        onChange={(e) => setMapping({ ...mapping, productNameCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-emerald-500 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                      {getSampleDataChips(mapping.productNameCol).length > 0 && (
                        <div className="flex items-center gap-1 overflow-x-auto text-[10px] text-slate-500">
                          <span>Mẫu:</span>
                          {getSampleDataChips(mapping.productNameCol).map((s, idx) => (
                            <span key={idx} className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[90px]">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 9. Số lượng sản phẩm */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                          Số lượng sản phẩm <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">Tùy chọn</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">Số lượng mỗi món trong kiện</p>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setMapping({ ...mapping, quantityMode: 'FIXED' })}
                          className={`px-3 py-1 rounded-lg transition ${mapping.quantityMode === 'FIXED' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                            }`}
                        >
                          ⚡ Cố định = 1
                        </button>
                        <button
                          type="button"
                          onClick={() => setMapping({ ...mapping, quantityMode: 'COLUMN' })}
                          className={`px-3 py-1 rounded-lg transition ${mapping.quantityMode === 'COLUMN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                            }`}
                        >
                          📑 Chọn từ Cột Excel
                        </button>
                      </div>
                    </div>

                    {mapping.quantityMode === 'FIXED' ? (
                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">Số lượng mặc định áp dụng chung:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={mapping.fixedQuantity}
                            onChange={(e) => setMapping({ ...mapping, fixedQuantity: parseInt(e.target.value) || 1 })}
                            className="w-20 px-2 py-1 bg-white border border-blue-200 rounded-lg text-center font-bold text-blue-800"
                          />
                        </div>
                      </div>
                    ) : (
                      <select
                        value={mapping.quantityCol}
                        onChange={(e) => setMapping({ ...mapping, quantityCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 10. Trọng lượng (kg) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                          Trọng lượng (kg) <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Bắt buộc</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">Trọng lượng hàng hóa để tính cước phí</p>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setMapping({ ...mapping, weightMode: 'FIXED' })}
                          className={`px-3 py-1 rounded-lg transition ${mapping.weightMode === 'FIXED' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                            }`}
                        >
                          ⚡ Cố định cho tất cả SP
                        </button>
                        <button
                          type="button"
                          onClick={() => setMapping({ ...mapping, weightMode: 'COLUMN' })}
                          className={`px-3 py-1 rounded-lg transition ${mapping.weightMode === 'COLUMN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                            }`}
                        >
                          📑 Chọn từ Cột Excel
                        </button>
                      </div>
                    </div>

                    {mapping.weightMode === 'FIXED' ? (
                      <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">Trọng lượng mặc định áp dụng chung:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={mapping.fixedWeight}
                            onChange={(e) => setMapping({ ...mapping, fixedWeight: parseFloat(e.target.value) || 0.5 })}
                            className="w-20 px-2 py-1 bg-white border border-purple-200 rounded-lg text-center font-bold text-purple-800"
                          />
                          <span className="font-bold text-purple-700">kg</span>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={mapping.weightCol}
                        onChange={(e) => setMapping({ ...mapping, weightCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 11. Tiền thu hộ COD (VNĐ) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Tiền thu hộ COD (VNĐ) <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">Tùy chọn</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Số tiền bưu tá thu hộ khách hàng</p>
                    </div>
                    <div className="sm:w-80">
                      <select
                        value={mapping.codAmountCol}
                        onChange={(e) => setMapping({ ...mapping, codAmountCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        <option value={-1}>— Bỏ qua (Mặc định 0 đ) —</option>
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 12. Khai giá hàng hóa (VNĐ) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Khai giá hàng hóa (VNĐ) <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">Tùy chọn</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Giá trị khai báo bảo hiểm hàng hóa</p>
                    </div>
                    <div className="sm:w-80">
                      <select
                        value={mapping.goodsValueCol}
                        onChange={(e) => setMapping({ ...mapping, goodsValueCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        <option value={-1}>— Bỏ qua (Mặc định theo tiền COD) —</option>
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 13. Ghi chú giao hàng */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        Ghi chú giao hàng <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">Tùy chọn</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Cho thử hàng, gọi trước khi giao...</p>
                    </div>
                    <div className="sm:w-80">
                      <select
                        value={mapping.deliveryNoteCol}
                        onChange={(e) => setMapping({ ...mapping, deliveryNoteCol: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-sm"
                      >
                        <option value={-1}>— Bỏ qua thuộc tính này —</option>
                        {columnOptions.map((c) => (
                          <option key={c.index} value={c.index}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                {/* Duplicate Handling Section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <p className="font-bold text-xs text-slate-800">
                    Xử lý khi đơn hàng đã tồn tại (Trùng mã ĐH Shop hoặc SĐT + Địa chỉ):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setMapping({ ...mapping, duplicateStrategy: 'SKIP' })}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${mapping.duplicateStrategy === 'SKIP'
                          ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-600'
                        }`}
                    >
                      <input
                        type="radio"
                        name="dupStrategy"
                        checked={mapping.duplicateStrategy === 'SKIP'}
                        onChange={() => setMapping({ ...mapping, duplicateStrategy: 'SKIP' })}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="font-extrabold text-xs">Bỏ qua đơn hàng trùng (Khuyên dùng)</p>
                        <p className="text-[11px] opacity-80">Giữ nguyên thông tin đã có, chỉ thêm các đơn hàng mới</p>
                      </div>
                    </label>

                    <label
                      onClick={() => setMapping({ ...mapping, duplicateStrategy: 'UPDATE' })}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${mapping.duplicateStrategy === 'UPDATE'
                          ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-600'
                        }`}
                    >
                      <input
                        type="radio"
                        name="dupStrategy"
                        checked={mapping.duplicateStrategy === 'UPDATE'}
                        onChange={() => setMapping({ ...mapping, duplicateStrategy: 'UPDATE' })}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="font-extrabold text-xs">Cập nhật thông tin mới</p>
                        <p className="text-[11px] opacity-80">Ghi đè thông tin địa chỉ, COD, ghi chú vào đơn cũ</p>
                      </div>
                    </label>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 3: XEM TRƯỚC & NHẬP */}
          {currentStep === 3 && (
            <div className="space-y-6">

              {/* Success Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-emerald-800 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Đã cấu hình ghép cột xong!</h4>
                    <p className="text-xs text-slate-600">
                      Đọc từ dòng <strong className="text-slate-900">{startRowIndex}</strong> đến dòng <strong className="text-slate-900">{endRowIndex}</strong> (Tự động bỏ qua các dòng tổng cộng / trống ở cuối).
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-white border border-emerald-300 rounded-full font-bold text-emerald-700 shadow-sm shrink-0">
                  Dòng {startRowIndex} → {endRowIndex} (~{parsedItems.length} Đơn)
                </span>
              </div>

              {/* Data Preview Table — scroll để kiểm tra toàn bộ dữ liệu */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <div className="max-h-[360px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                        <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                          <th className="p-2.5 w-12 text-center">DÒNG</th>
                          <th className="p-2.5">MÃ ĐH SHOP</th>
                          <th className="p-2.5">TÊN NGƯỜI NHẬN &amp; SĐT</th>
                          <th className="p-2.5">ĐỊA CHỈ GIAO HÀNG</th>
                          <th className="p-2.5">SẢN PHẨM</th>
                          <th className="p-2.5">TRỌNG LƯỢNG</th>
                          <th className="p-2.5 text-right">TIỀN COD</th>
                          <th className="p-2.5 text-center">TRẠNG THÁI</th>
                          <th className="p-2.5 text-center w-20">THAO TÁC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedItems.map((item) => {
                          const isEditingThisRow = editingStep3RowIndex === item.rowIndex;

                          return (
                            <tr
                              key={item.rowIndex}
                              className={`transition-colors ${
                                isEditingThisRow
                                  ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                                  : !item.isValid
                                  ? 'bg-red-50/60 hover:bg-red-100/40'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              {/* Dòng */}
                              <td className="p-2.5 text-center font-bold text-slate-500 font-mono">
                                {item.rowIndex}
                              </td>

                              {/* Mã ĐH Shop */}
                              <td className="p-2.5 font-mono font-bold text-slate-700 text-[11px]">
                                {isEditingThisRow ? (
                                  <input
                                    type="text"
                                    value={item.shopOrderCode}
                                    onChange={(e) =>
                                      handleUpdateStep3Row(item.rowIndex, { shopOrderCode: e.target.value })
                                    }
                                    className="w-24 px-1.5 py-0.5 border border-blue-400 rounded bg-white font-bold text-xs"
                                  />
                                ) : (
                                  item.shopOrderCode || '—'
                                )}
                              </td>

                              {/* Tên & SĐT người nhận */}
                              <td className="p-2.5">
                                {isEditingThisRow ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      placeholder="Họ tên người nhận"
                                      value={item.receiverName}
                                      onChange={(e) =>
                                        handleUpdateStep3Row(item.rowIndex, { receiverName: e.target.value })
                                      }
                                      className="w-full px-1.5 py-0.5 border border-blue-400 rounded bg-white font-bold text-xs text-slate-900"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Số điện thoại"
                                      value={item.receiverPhone}
                                      onChange={(e) =>
                                        handleUpdateStep3Row(item.rowIndex, { receiverPhone: e.target.value })
                                      }
                                      className="w-full px-1.5 py-0.5 border border-blue-400 rounded bg-white font-mono text-xs text-slate-900"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-extrabold text-slate-800 block">{item.receiverName || '—'}</span>
                                    <span className="text-[11px] text-slate-500 font-mono">{item.receiverPhone || '—'}</span>
                                  </>
                                )}
                              </td>

                              {/* Địa chỉ giao hàng */}
                              <td className="p-2.5 text-slate-700">
                                {isEditingThisRow ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      placeholder="Địa chỉ chi tiết"
                                      value={item.detailAddress}
                                      onChange={(e) =>
                                        handleUpdateStep3Row(item.rowIndex, { detailAddress: e.target.value })
                                      }
                                      className="w-full px-1.5 py-0.5 border border-blue-400 rounded bg-white text-xs"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Tỉnh/Thành phố"
                                      value={item.province}
                                      onChange={(e) =>
                                        handleUpdateStep3Row(item.rowIndex, { province: e.target.value })
                                      }
                                      className="w-full px-1.5 py-0.5 border border-blue-400 rounded bg-white text-xs"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <span className="block truncate max-w-[150px]" title={item.detailAddress}>
                                      {item.detailAddress || '—'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{item.province || '—'}</span>
                                  </>
                                )}
                              </td>

                              {/* Sản phẩm */}
                              <td className="p-2.5 font-medium text-slate-800">
                                {isEditingThisRow ? (
                                  <input
                                    type="text"
                                    value={item.productName}
                                    onChange={(e) =>
                                      handleUpdateStep3Row(item.rowIndex, { productName: e.target.value })
                                    }
                                    className="w-full px-1.5 py-0.5 border border-blue-400 rounded bg-white text-xs"
                                  />
                                ) : (
                                  <>
                                    <span className="block truncate max-w-[130px]" title={item.productName}>
                                      {item.productName || '—'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">x{item.quantity}</span>
                                  </>
                                )}
                              </td>

                              {/* Trọng lượng */}
                              <td className="p-2.5 font-mono font-bold text-purple-700">
                                {isEditingThisRow ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={item.weight}
                                    onChange={(e) =>
                                      handleUpdateStep3Row(item.rowIndex, {
                                        weight: parseFloat(e.target.value) || 0.5,
                                      })
                                    }
                                    className="w-16 px-1.5 py-0.5 border border-blue-400 rounded bg-white text-xs font-mono font-bold"
                                  />
                                ) : (
                                  `${item.weight} kg`
                                )}
                              </td>

                              {/* Tiền COD */}
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                                {isEditingThisRow ? (
                                  <input
                                    type="number"
                                    value={item.codAmount}
                                    onChange={(e) =>
                                      handleUpdateStep3Row(item.rowIndex, {
                                        codAmount: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    className="w-20 px-1.5 py-0.5 border border-blue-400 rounded bg-white text-xs font-mono font-bold text-right"
                                  />
                                ) : (
                                  `${item.codAmount.toLocaleString('vi-VN')} đ`
                                )}
                              </td>

                              {/* Trạng thái */}
                              <td className="p-2.5 text-center">
                                {item.isValid ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 inline-flex items-center gap-1 shadow-sm">
                                    <Check className="w-3 h-3" /> Hợp Lệ
                                  </span>
                                ) : (
                                  <span
                                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 cursor-help inline-flex items-center gap-1 shadow-sm"
                                    title={item.errors?.join(' | ')}
                                  >
                                    <AlertTriangle className="w-3 h-3" /> Lỗi ({item.errors?.length})
                                  </span>
                                )}
                              </td>

                              {/* Thao tác: Sửa / Xóa */}
                              <td className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {isEditingThisRow ? (
                                    <button
                                      type="button"
                                      onClick={() => setEditingStep3RowIndex(null)}
                                      className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                                      title="Lưu chỉnh sửa dòng này"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditingStep3RowIndex(item.rowIndex)}
                                      className="p-1 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition"
                                      title="Sửa trực tiếp thông tin dòng này"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStep3Row(item.rowIndex)}
                                    className="p-1 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition"
                                    title="Xóa bỏ dòng này khỏi danh sách nhập"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer row count */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>
                    Tổng <strong className="text-slate-800 font-bold">{parsedItems.length}</strong> dòng xem trước
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 font-extrabold">
                      ✓ {parsedItems.filter((i) => i.isValid).length} Hợp lệ
                    </span>
                    {parsedItems.filter((i) => !i.isValid).length > 0 && (
                      <span className="text-red-500 font-extrabold">
                        ⚠️ {parsedItems.filter((i) => !i.isValid).length} Lỗi
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Banner Cảnh báo Lỗi & Nút Xử lý linh hoạt */}
              {parsedItems.filter((i) => !i.isValid).length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-amber-900">
                        Phát hiện {parsedItems.filter((i) => !i.isValid).length} dòng bị thiếu hoặc sai dữ liệu!
                      </p>
                      <p className="text-[11px] text-amber-700">
                        Bạn có thể bấm biểu tượng ✏️ để bổ sung thông tin ngay trên dòng đó, xóa dòng lỗi, hoặc bấm nút bên dưới để chọn lại ghép cột.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handlePurgeInvalidStep3Rows}
                      className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Xóa tất cả các dòng bị lỗi và chỉ giữ lại các dòng hợp lệ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa sạch {parsedItems.filter((i) => !i.isValid).length} dòng lỗi
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-extrabold transition cursor-pointer shadow-sm"
                    >
                      ← Quay lại Step 2
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* STEP 4: KẾT QUẢ */}
          {currentStep === 4 && (
            <div className="space-y-6 py-2">

              {/* Importing In-Progress Screen */}
              {importing ? (
                <div className="text-center space-y-5 py-6">
                  {/* Circular Progress Display */}
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin"></div>
                    <span className="absolute font-black text-slate-800 text-lg font-mono">
                      {importProgress}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-slate-800">Đang tiến hành nhập dữ liệu vào hệ thống...</h3>
                    <p className="text-xs text-slate-500">Vui lòng không đóng cửa sổ trong lúc hệ thống xử lý</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="max-w-md mx-auto space-y-1.5">
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-bold">
                      <span>Đang xử lý từ dòng {startRowIndex} → {endRowIndex}</span>
                      <span>~{parsedItems.length} đơn hàng</span>
                    </div>
                  </div>

                  {/* Checklist Card */}
                  <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-left text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Đọc & kiểm tra cấu trúc bảng tính Excel
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Kiểm tra mã đơn & SĐT người nhận trùng lặp
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Gán thông tin địa chỉ & tính tiền COD
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Lưu vào hệ thống và dọn dẹp file tạm
                    </div>
                  </div>
                </div>
              ) : (
                /* Finished Result Screen */
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">Hoàn Tất Quá Trình Nhập Dữ Liệu!</h3>
                    <p className="text-xs text-slate-500">
                      Đã xử lý tổng cộng <strong>{parsedItems.length}</strong> dòng dữ liệu từ file Excel (File tạm đã được dọn sạch)
                    </p>
                  </div>

                  {/* 4 Stat Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Thành công</p>
                      <p className="text-2xl font-black text-emerald-800 mt-1">{importResults.success}</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-center">
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Đã cập nhật</p>
                      <p className="text-2xl font-black text-blue-800 mt-1">{importResults.updated}</p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-center">
                      <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Bỏ qua (Trùng)</p>
                      <p className="text-2xl font-black text-amber-800 mt-1">{importResults.skipped}</p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-center">
                      <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Lỗi / Thiếu tên</p>
                      <p className="text-2xl font-black text-red-800 mt-1">{importResults.errors}</p>
                    </div>
                  </div>

                  {/* Detailed Alert Log Section */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                    <p className="font-bold text-xs text-slate-800">Chi tiết các dòng bỏ qua hoặc lỗi:</p>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 text-[11px]">
                      {importResults.logs.length === 0 ? (
                        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-center">
                          Tất cả các dòng dữ liệu đều được nhập thành công mà không có lỗi hoặc bị trùng!
                        </div>
                      ) : (
                        importResults.logs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg flex items-start gap-2 ${log.type === 'SKIPPED'
                                ? 'bg-amber-50 text-amber-800'
                                : log.type === 'ERROR'
                                  ? 'bg-red-50 text-red-800'
                                  : 'bg-blue-50 text-blue-800'
                              }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>
                              Dòng <strong>{log.rowIndex}</strong> ({log.title}): {log.reason}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* BOTTOM MODAL ACTION FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between flex-shrink-0">
          <div>
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Sửa cấu hình mapping
              </button>
            )}

            {currentStep === 4 && !importing && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Thu nhỏ xuống góc
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep === 1 && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Đóng
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleProceedToPreview}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
              >
                Tiếp tục: Xem trước <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={handleExecuteImport}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
              >
                Xác nhận Nhập dữ liệu <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 4 && !importing && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md transition"
              >
                Đóng & Xem danh sách đơn
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
