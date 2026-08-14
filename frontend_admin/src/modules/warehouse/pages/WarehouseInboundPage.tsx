import React, { useState, useRef, useEffect } from 'react';
import { warehouseApi } from '../services/warehouse.api';
import { InboundLogTable } from '../components/InboundLogTable';
import type { ScanItemLog } from '../components/InboundLogTable';
import { Barcode, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export const WarehouseInboundPage: React.FC = () => {
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [condition, setCondition] = useState<'INTACT' | 'DAMAGED' | 'TORN_SEAL'>('INTACT');
  const [scanLogs, setScanLogs] = useState<ScanItemLog[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });

  const inputRef = useRef<HTMLInputElement>(null);

  // Luôn tự động Focus vào ô Input để nhận tín hiệu từ Súng quét Barcode USB
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  // Xử lý sự kiện nhấn Enter từ súng quét barcode USB
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeInboundScan(barcodeInput);
    }
  };

  const executeInboundScan = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    // Reset input ngay để nhân viên bóp cò súng quét kiện kế tiếp
    setBarcodeInput('');
    inputRef.current?.focus();

    try {
      const res = await warehouseApi.scanInbound({
        tracking_code: cleanCode,
        package_condition: condition
      });

      const resData = res.data || {
        current_status: 'IN_HUB_ORIGIN',
        next_action: 'SORT_FOR_TRANSIT',
        is_flagged: condition !== 'INTACT'
      };

      const newLog: ScanItemLog = {
        id: `${Date.now()}-${Math.random()}`,
        tracking_code: cleanCode,
        status: resData.current_status,
        next_action: resData.next_action,
        is_flagged: resData.is_flagged || condition !== 'INTACT',
        time: new Date().toLocaleTimeString('vi-VN'),
        isSuccess: true
      };

      setScanLogs((prev) => [newLog, ...prev]);
      setStats((prev) => ({ ...prev, total: prev.total + 1, success: prev.success + 1 }));
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Lỗi quét kiện hàng (Xung đột hoặc Mã không hợp lệ)';
      const failedLog: ScanItemLog = {
        id: `${Date.now()}-${Math.random()}`,
        tracking_code: cleanCode,
        status: 'FAILED',
        next_action: 'HOLD',
        is_flagged: true,
        time: new Date().toLocaleTimeString('vi-VN'),
        isSuccess: false,
        errorMessage: errMsg
      };

      setScanLogs((prev) => [failedLog, ...prev]);
      setStats((prev) => ({ ...prev, total: prev.total + 1, failed: prev.failed + 1 }));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" onClick={handleContainerClick}>
      {/* Header & Thống kê */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-cyan-400">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Quét Nhập Kho & Phân Luồng (UC-16 Inbound)</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Chuyên dụng cho Súng quét mã vạch USB tại Bưu cục Gốc / Kho Tổng / Bưu cục Đích
              </p>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-initial text-center px-5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tổng quét</p>
            <p className="text-xl font-black text-slate-100">{stats.total}</p>
          </div>
          <div className="flex-1 md:flex-initial text-center px-5 py-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
            <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Thành công
            </p>
            <p className="text-xl font-black text-emerald-300">{stats.success}</p>
          </div>
          <div className="flex-1 md:flex-initial text-center px-5 py-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl">
            <p className="text-[10px] text-rose-400 uppercase font-bold tracking-wider flex items-center justify-center gap-1">
              <XCircle className="w-3 h-3" /> Lỗi / Ngoại lệ
            </p>
            <p className="text-xl font-black text-rose-300">{stats.failed}</p>
          </div>
        </div>
      </div>

      {/* Khung quét chuyên dụng USB Barcode Scanner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-cyan-400" />
              Bắn mã vạch vào đây (Tự động nhận tín hiệu Súng Barcode USB & Enter):
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Đặt con trỏ tại đây và bóp cò súng quét..."
                className="w-full text-lg font-mono border-2 border-blue-500/80 rounded-xl px-4 py-3.5 bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-cyan-400 transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-400 bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/30">
                READY FOR SCAN
              </span>
            </div>
          </div>

          <div className="w-full md:w-64">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tình trạng ngoại quan kiện hàng:
            </label>
            <select
              value={condition}
              onChange={(e: any) => setCondition(e.target.value)}
              className="w-full border border-slate-700 rounded-xl px-4 py-3.5 text-sm bg-slate-950 text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="INTACT">✅ Nguyên vẹn (Bình thường)</option>
              <option value="DAMAGED">⚠️ Hư hỏng / Móp méo</option>
              <option value="TORN_SEAL">❌ Rách niêm phong</option>
            </select>
          </div>
        </div>

        {condition !== 'INTACT' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Cảnh báo: Kiện hàng được chọn tình trạng <strong>{condition}</strong>. Hệ thống sẽ dán cờ <strong>is_flagged = true</strong> và chuyển luồng xử lý sang khu vực kiểm tra ngoại lệ!
            </span>
          </div>
        )}
      </div>

      {/* Bảng Log Lịch Sử Quét Realtime */}
      <InboundLogTable logs={scanLogs} />
    </div>
  );
};

export default WarehouseInboundPage;
