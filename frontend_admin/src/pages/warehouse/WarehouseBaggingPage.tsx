import React, { useState, useEffect, useRef } from 'react';
import { bagApi } from '@/api/bag.api';
import { toast } from 'sonner';
import { CameraScanner } from '@/components/driver/CameraScanner';
import {
  Package,
  Truck,
  Plus,
  Lock,
  Trash2,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Boxes,
  Camera,
  Keyboard,
} from 'lucide-react';

const HUBS_LIST = [
  { id: '6a8016bc2c43f32e6cd53dba', code: 'HUB_HAN_01', name: 'Kho Tổng Hà Nội (Miền Bắc)' },
  { id: '6a8016bc2c43f32e6cd53dbb', code: 'HUB_DAD_01', name: 'Kho Tổng Đà Nẵng (Miền Trung)' },
  { id: '6a8016bd2c43f32e6cd53dbc', code: 'HUB_SGN_01', name: 'Kho Tổng TP.HCM (Miền Nam)' },
  { id: '6a8016bd2c43f32e6cd53dc1', code: 'HUB_HPH_01', name: 'Bưu cục Hải Phòng' },
  { id: '6a8016bd2c43f32e6cd53dbe', code: 'HUB_VCA_01', name: 'Bưu cục Cần Thơ' },
  { id: '6a8016bd2c43f32e6cd53dbf', code: 'HUB_BDG_01', name: 'Bưu cục Bình Dương' },
  { id: '6a8016bd2c43f32e6cd53dc0', code: 'HUB_DNI_01', name: 'Bưu cục Đồng Nai' },
];

export const WarehouseBaggingPage: React.FC = () => {
  // Active Bag State
  const [activeBag, setActiveBag] = useState<any | null>(null);
  const [activeBagsList, setActiveBagsList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Open Bag Form State
  const [sealCodeInput, setSealCodeInput] = useState<string>('');
  const [destHubIdInput, setDestHubIdInput] = useState<string>(HUBS_LIST[0].id);
  const [maxCapacityInput, setMaxCapacityInput] = useState<number>(30);
  const [maxWeightInput, setMaxWeightInput] = useState<number>(25);

  // Scan Item State
  const [trackingCodeInput, setTrackingCodeInput] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    trackingCode: string;
    message: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load active bags on mount
  const fetchActiveBags = async () => {
    try {
      const res = await bagApi.listBags('OPEN');
      const bags = res.data?.data || [];
      setActiveBagsList(bags);
      if (!activeBag && bags.length > 0) {
        setActiveBag(bags[0]);
      }
    } catch (err: any) {
      console.error('Error fetching bags:', err);
    }
  };

  useEffect(() => {
    fetchActiveBags();
  }, []);

  // Mở bao tải mới
  const handleOpenBag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sealCodeInput.trim()) {
      toast.error('Vui lòng nhập hoặc tạo mã Seal');
      return;
    }
    setLoading(true);
    try {
      const res = await bagApi.openBag({
        seal_code: sealCodeInput.trim().toUpperCase(),
        destination_hub_id: destHubIdInput,
        max_capacity: maxCapacityInput,
        max_weight_kg: maxWeightInput,
      });
      const newBag = res.data?.data;
      toast.success(`Đã mở bao tải mới [${newBag.seal_code}] thành công!`);
      setActiveBag(newBag);
      setSealCodeInput('');
      fetchActiveBags();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi mở bao tải mới');
    } finally {
      setLoading(false);
    }
  };

  // Tạo nhanh mã Seal ngẫu nhiên
  const handleGenerateSealCode = () => {
    const code = `SEAL-${Date.now().toString().slice(-6)}`;
    setSealCodeInput(code);
  };

  // Quét thả kiện hàng vào bao
  const handleAddItem = async (codeToScan?: string) => {
    const code = (codeToScan || trackingCodeInput).trim().toUpperCase();
    if (!code) return;
    if (!activeBag) {
      toast.error('Vui lòng mở hoặc chọn một bao tải trước khi quét hàng!');
      return;
    }

    try {
      const res = await bagApi.addItem({
        seal_code: activeBag.sealCode || activeBag.seal_code,
        tracking_code: code,
      });
      const result = res.data?.data;
      setLastScanResult({
        success: true,
        trackingCode: code,
        message: `Đã gom kiện [${code}] vào bao thành công (+${result.item_info?.weight_kg || 0.5} kg)`,
      });
      toast.success(`✓ ${code} ➔ ${activeBag.sealCode || activeBag.seal_code}`);
      setTrackingCodeInput('');

      // Refresh active bag details
      const bagDetailRes = await bagApi.getBag(activeBag.sealCode || activeBag.seal_code);
      setActiveBag(bagDetailRes.data?.data);
      fetchActiveBags();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Lỗi khi thêm kiện hàng vào bao';
      setLastScanResult({
        success: false,
        trackingCode: code,
        message: errorMsg,
      });
      toast.error(errorMsg);
    } finally {
      if (inputRef.current) inputRef.current.focus();
    }
  };

  // Xóa kiện hàng khỏi bao
  const handleRemoveItem = async (trackingCode: string) => {
    if (!activeBag) return;
    try {
      await bagApi.removeItem({
        seal_code: activeBag.sealCode || activeBag.seal_code,
        tracking_code: trackingCode,
      });
      toast.success(`Đã gỡ kiện [${trackingCode}] khỏi bao`);
      const bagDetailRes = await bagApi.getBag(activeBag.sealCode || activeBag.seal_code);
      setActiveBag(bagDetailRes.data?.data);
      fetchActiveBags();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi gỡ kiện hàng');
    }
  };

  // Khóa niêm phong bao tải
  const handleSealBag = async () => {
    if (!activeBag) return;
    if (activeBag.trackingCodes?.length === 0) {
      toast.error('Không thể niêm phong bao tải rỗng!');
      return;
    }
    setLoading(true);
    try {
      const res = await bagApi.sealBag({
        seal_code: activeBag.sealCode || activeBag.seal_code,
      });
      const data = res.data?.data;
      toast.success(`🔒 Đã khóa niêm phong bao tải [${data.seal_code}] với ${data.total_items} kiện hàng!`);
      setActiveBag(null);
      fetchActiveBags();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi niêm phong bao tải');
    } finally {
      setLoading(false);
    }
  };

  const totalItems = activeBag?.trackingCodes?.length || 0;
  const maxCap = activeBag?.maxCapacity || 30;
  const totalWeight = activeBag?.totalWeightKg || 0;
  const maxWeight = activeBag?.maxWeightKg || 25;
  const progressPercent = Math.min(100, Math.round((totalItems / maxCap) * 100));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <Boxes className="w-6 h-6 text-orange-500" />
            Gom Bao & Niêm Phong Seal (Bagging Engine)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quy trình Scan-to-Bag: Kiểm soát tuyến đường Poka-Yoke & Chống nhầm bao
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchActiveBags}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới danh sách
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: FORM MỞ BAO TẢI MỚI & DANH SÁCH BAO ĐANG MỞ */}
        <div className="space-y-6">
          {/* Card: Mở Bao Mới */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Plus className="w-4 h-4 text-orange-400" />
              1. Mở Bao Tải Mới
            </h2>

            <form onSubmit={handleOpenBag} className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 font-semibold">Mã Khóa Seal *</label>
                  <button
                    type="button"
                    onClick={handleGenerateSealCode}
                    className="text-orange-400 hover:text-orange-300 text-[11px] font-bold underline"
                  >
                    Tạo mã nhanh
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="VD: SEAL-HAN-001"
                  value={sealCodeInput}
                  onChange={(e) => setSealCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-orange-500 transition"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Hub Đích Đến *</label>
                <select
                  value={destHubIdInput}
                  onChange={(e) => setDestHubIdInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-orange-500 transition"
                >
                  {HUBS_LIST.map((hub) => (
                    <option key={hub.id} value={hub.id}>
                      {hub.name} ({hub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Sức chứa (Kiện)</label>
                  <input
                    type="number"
                    value={maxCapacityInput}
                    onChange={(e) => setMaxCapacityInput(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Trọng lượng (Kg)</label>
                  <input
                    type="number"
                    value={maxWeightInput}
                    onChange={(e) => setMaxWeightInput(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 transition flex items-center justify-center gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                Mở Bao Tải Mới
              </button>
            </form>
          </div>

          {/* Card: Danh Sách Bao Đang Mở */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Bao đang mở ({activeBagsList.length})</span>
            </h3>
            {activeBagsList.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">Chưa có bao nào đang mở</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeBagsList.map((bag) => {
                  const isCurrent =
                    (activeBag?.sealCode || activeBag?.seal_code) === (bag.sealCode || bag.seal_code);
                  return (
                    <div
                      key={bag._id}
                      onClick={() => setActiveBag(bag)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-orange-950/40 border-orange-500/50 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-mono font-bold text-orange-400 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" />
                          {bag.sealCode || bag.seal_code}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[170px]">
                          {bag.destinationHubId?.name || 'Kho đích'}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-800 rounded-md text-slate-300">
                        {bag.trackingCodes?.length || 0}/{bag.maxCapacity || 30}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CỘT GIỮA & PHẢI: KHU VỰC QUÉT HÀNG VÀO BAO & CHI TIẾT */}
        <div className="lg:col-span-2 space-y-6">
          {activeBag ? (
            <>
              {/* Active Bag Status Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-orange-500/40 p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400 bg-orange-950/60 px-2.5 py-0.5 rounded-full border border-orange-800/60">
                      BAO ĐANG GOM HÀNG
                    </span>
                    <h2 className="text-2xl font-mono font-black text-white mt-1">
                      {activeBag.sealCode || activeBag.seal_code}
                    </h2>
                    <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <Truck className="w-3.5 h-3.5 text-orange-400" />
                      Điểm đến:{' '}
                      <span className="font-bold text-orange-300">
                        {activeBag.destinationHubId?.name || activeBag.destination_hub_name || 'Kho đích'}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={handleSealBag}
                    disabled={loading || totalItems === 0}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    Khóa Niêm Phong (SEAL)
                  </button>
                </div>

                {/* Progress Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">SỐ KIỆN HIỆN TẠI</p>
                    <p className="text-xl font-black text-white font-mono mt-0.5">
                      {totalItems} <span className="text-xs text-slate-400 font-normal">/ {maxCap}</span>
                    </p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">TỔNG KHỐI LƯỢNG</p>
                    <p className="text-xl font-black text-orange-400 font-mono mt-0.5">
                      {totalWeight.toFixed(1)}{' '}
                      <span className="text-xs text-slate-400 font-normal">/ {maxWeight} kg</span>
                    </p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">ĐỘ ĐẦY ĐỊNH MỨC</p>
                    <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">{progressPercent}%</p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">TRẠNG THÁI</p>
                    <span className="inline-block mt-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      OPEN (Đang mở)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      progressPercent >= 100
                        ? 'bg-rose-500'
                        : progressPercent >= 80
                        ? 'bg-amber-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Scan Box (Camera + Input) */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-orange-400" />
                    2. Quét Thả Kiện Hàng Vào Bao
                  </h3>
                  <button
                    onClick={() => setIsCameraActive(!isCameraActive)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <Camera className="w-3.5 h-3.5 text-orange-400" />
                    {isCameraActive ? 'Tắt Camera' : 'Bật Camera'}
                  </button>
                </div>

                {/* Camera Scanner View */}
                {isCameraActive && (
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2">
                    <CameraScanner
                      isActive={isCameraActive}
                      onScanSuccess={(code) => handleAddItem(code)}
                    />
                  </div>
                )}

                {/* Input Barcode */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Keyboard className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Quét mã vạch hoặc nhập mã vận đơn (VD: ELG-VN-123456)..."
                      value={trackingCodeInput}
                      onChange={(e) => setTrackingCodeInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-orange-500 transition shadow-inner"
                    />
                  </div>
                  <button
                    onClick={() => handleAddItem()}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/20 transition cursor-pointer"
                  >
                    Thêm vào bao
                  </button>
                </div>

                {/* Last Scan Feedback */}
                {lastScanResult && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs transition ${
                      lastScanResult.success
                        ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-700/50 text-rose-300'
                    }`}
                  >
                    {lastScanResult.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    )}
                    <span className="font-medium">{lastScanResult.message}</span>
                  </div>
                )}
              </div>

              {/* Items List in Bag */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-orange-400" />
                    Danh sách kiện hàng trong bao ({totalItems})
                  </h3>
                </div>

                {totalItems === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs italic">
                    Bao tải chưa có kiện hàng nào. Hãy quét mã vận đơn để thả hàng vào bao!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                    {activeBag.trackingCodes?.map((code: string, idx: number) => (
                      <div
                        key={code}
                        className="px-5 py-3 flex items-center justify-between hover:bg-slate-800/40 transition text-xs"
                      >
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-500 font-bold w-5">{idx + 1}.</span>
                          <span className="font-bold text-orange-400">{code}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(code)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                          title="Gỡ khỏi bao"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <Boxes className="w-12 h-12 mx-auto text-slate-600 stroke-[1.5]" />
              <h3 className="text-base font-bold text-slate-300">Chưa chọn bao tải nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hãy mở một bao tải mới ở cột bên trái hoặc chọn một bao tải đang mở để bắt đầu quét gom kiện hàng.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseBaggingPage;
