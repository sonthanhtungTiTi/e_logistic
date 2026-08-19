import React, { useState, useEffect } from 'react';
import { CameraScanner } from '@/components/driver/CameraScanner';
import { SellerSignatureModal } from '@/components/driver/SellerSignatureModal';
import { driverApi } from '@/api/driver.api';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  MapPin,
  Send,
  Search,
  RefreshCw,
  FileCheck,
  PackageCheck,
  Calendar,
  Clock,
  Phone,
  Eye,
  Plus,
  X,
  User,
  Box,
} from 'lucide-react';

const LOCAL_STORAGE_HISTORY_KEY = 'driver_pickup_history_cache';

const isToday = (dateString?: string) => {
  if (!dateString) return true;
  const d = new Date(dateString);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

export const DriverPickupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'SCAN' | 'HISTORY'>('SCHEDULE');
  const [scheduleDateFilter, setScheduleDateFilter] = useState<'TODAY' | 'PREVIOUS' | 'ALL'>('TODAY');

  const [manualCode, setManualCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  
  // Pending Orders (Lịch Đơn Cần Thu Gom - READY_TO_PICK)
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState<boolean>(false);
  const [searchPendingTerm, setSearchPendingTerm] = useState<string>('');

  // History Orders (Đơn Đã Thu Gom)
  const [history, setHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [searchHistoryTerm, setSearchHistoryTerm] = useState<string>('');
  const [isSyncingServer, setIsSyncingServer] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Staging Batch (Giỏ Gom Đơn Tại Shop)
  const [stagingBatch, setStagingBatch] = useState<string[]>([]);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);

  // Modal xem chi tiết đơn hàng cho tài xế
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<any | null>(null);

  // Initial Load: Lấy cả lịch đơn chờ lấy & đơn đã lấy
  useEffect(() => {
    loadAllDriverData();
  }, []);

  // Sync cache history to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Cannot save history to localStorage:', e);
    }
  }, [history]);

  const loadAllDriverData = async () => {
    setIsSyncingServer(true);
    await Promise.all([loadPendingOrders(), loadServerPickedUpOrders()]);
    setIsSyncingServer(false);
  };

  const loadPendingOrders = async () => {
    setIsLoadingPending(true);
    try {
      const pendingList = await driverApi.getPendingPickupOrders();
      setPendingOrders(pendingList);
    } catch (e) {
      console.warn('Failed to load pending pickup orders:', e);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const loadServerPickedUpOrders = async () => {
    try {
      const serverOrders = await driverApi.getPickedUpOrders();
      if (Array.isArray(serverOrders) && serverOrders.length > 0) {
        const formatted = serverOrders.map((ord: any) => ({
          tracking_code: ord.trackingCode || ord.tracking_code,
          trackingCode: ord.trackingCode || ord.tracking_code,
          status: ord.status || 'PICKED_UP',
          picked_at: ord.pickedAt || ord.updatedAt || ord.createdAt,
          seller_name: ord.sellerId?.companyName || ord.sellerId?.fullName || ord.pickupAddress?.fullName || 'Shop Kho Hàng',
          destination_hub_name: ord.deliveryAddress?.province || ord.deliveryAddress?.district || 'Kho Gốc',
          codAmount: ord.codAmount || 0,
          shippingFee: ord.shippingFee || 0,
          fullOrder: ord
        }));

        setHistory((prev) => {
          const map = new Map<string, any>();
          [...formatted, ...prev].forEach((item) => {
            const code = (item.tracking_code || item.trackingCode || '').toUpperCase();
            if (code && !map.has(code)) {
              map.set(code, item);
            }
          });
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.warn('Failed to load server picked up orders:', e);
    }
  };

  // GPS helper
  const getGpsPosition = (): Promise<{ latitude?: number; longitude?: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ latitude: undefined, longitude: undefined });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({ latitude: undefined, longitude: undefined }),
        { timeout: 4000, enableHighAccuracy: true }
      );
    });
  };

  // Sound response helper
  const playSound = (type: 'success' | 'error') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'success' ? 'sine' : 'square';
      osc.frequency.setValueAtTime(type === 'success' ? 880 : 300, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (type === 'success' ? 0.15 : 0.3));
    } catch {
      // AudioContext fallback
    }
  };

  // Thêm kiện hàng vào giỏ gom
  const handleInitiatePickup = async (trackingCode: string) => {
    if (isSignatureModalOpen) return;
    const cleanCode = trackingCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (stagingBatch.includes(cleanCode)) {
      playSound('error');
      setStatusMsg({ type: 'error', text: `⚠️ Mã vận đơn ${cleanCode} đã có trong Giỏ Gom Đơn hiện tại!` });
      return;
    }

    try {
      setLoading(true);
      setStatusMsg(null);
      const checkRes = await driverApi.verifyPickupScan(cleanCode);
      if (checkRes.success) {
        playSound('success');
        setStagingBatch((prev) => [...prev, cleanCode]);
        setStatusMsg({
          type: 'info',
          text: `➕ Đã gom đơn [${cleanCode}] vào lô (Trạng thái: ${checkRes.data?.status || 'Sẵn sàng'}). Total: ${stagingBatch.length + 1} đơn.`
        });
        setManualCode('');
      }
    } catch (err: any) {
      playSound('error');
      const msg = err.response?.data?.message || err.message || 'Lỗi kiểm tra mã vận đơn';
      setStatusMsg({ type: 'error', text: `❌ ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  // Xóa đơn khỏi giỏ gom
  const handleRemoveFromStaging = (codeToRemove: string) => {
    if (isSignatureModalOpen) return;
    setStagingBatch((prev) => prev.filter((c) => c !== codeToRemove));
  };

  // Chốt ePOH Manifest với chữ ký Seller
  const handleConfirmBatchWithSignature = async (signatureBase64: string) => {
    if (stagingBatch.length === 0) return;
    setIsSignatureModalOpen(false);
    setLoading(true);
    setStatusMsg(null);

    try {
      const coords = await getGpsPosition();
      const successResults: any[] = [];
      const errorCodes: string[] = [];
      const errorDetails: string[] = [];

      for (const code of stagingBatch) {
        try {
          const res = await driverApi.confirmPickup({
            tracking_code: code,
            signatureImageUrl: signatureBase64,
            latitude: coords.latitude,
            longitude: coords.longitude
          });

          const orderObj = (res as any).order || (res as any).data?.order || (res as any).data || {};
          const confirmedCode = orderObj.trackingCode || orderObj.tracking_code || code;

          successResults.push({
            tracking_code: confirmedCode,
            trackingCode: confirmedCode,
            status: 'PICKED_UP',
            picked_at: orderObj.updatedAt || new Date().toISOString(),
            seller_name: orderObj.pickupAddress?.fullName || 'Seller Direct',
            destination_hub_name: orderObj.deliveryAddress?.province || 'Kho Gốc',
            codAmount: orderObj.codAmount || 0,
            shippingFee: orderObj.shippingFee || 0,
            fullOrder: orderObj
          });
        } catch (err: any) {
          console.error(`Lỗi xác nhận đơn ${code}:`, err);
          const backendMsg = err.response?.data?.message || err.message || 'Lỗi xác nhận từ Server';
          errorDetails.push(`${code}: ${backendMsg}`);
          errorCodes.push(code);
        }
      }

      if (successResults.length > 0) {
        setHistory((prev) => {
          const map = new Map<string, any>();
          [...successResults, ...prev].forEach((item) => {
            const c = (item.tracking_code || item.trackingCode || '').toUpperCase();
            if (c) map.set(c, item);
          });
          return Array.from(map.values());
        });

        // Loại bỏ các đơn thành công khỏi danh sách pending
        const successCodesSet = new Set(successResults.map((s) => s.trackingCode));
        setPendingOrders((prev) => prev.filter((p) => !successCodesSet.has(p.trackingCode)));

        setStagingBatch(errorCodes);

        if (errorCodes.length === 0) {
          playSound('success');
          setStatusMsg({ type: 'success', text: `Đã tạo ePOH & chốt gán thành công ${successResults.length} đơn hàng cho tài xế!` });
        } else {
          playSound('error');
          setStatusMsg({
            type: 'error',
            text: `⚠️ Đã chốt ${successResults.length} đơn thành công. Lỗi ${errorCodes.length} đơn:\n• ` + errorDetails.join('\n• ')
          });
        }
      } else {
        playSound('error');
        setStatusMsg({
          type: 'error',
          text: `❌ Không thể xác nhận lấy hàng! Chi tiết:\n• ` + errorDetails.join('\n• ')
        });
      }
    } catch (err: any) {
      playSound('error');
      setStatusMsg({
        type: 'error',
        text: err.message || '❌ Có lỗi xảy ra khi chốt Biên bản Bàn giao lô hàng.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Tính số lượng đơn hôm nay vs ngày trước
  const todayPendingCount = pendingOrders.filter((ord) => isToday(ord.readyToPickAt || ord.updatedAt || ord.createdAt)).length;
  const previousPendingCount = pendingOrders.length - todayPendingCount;

  // Lọc lịch trình thu gom pending theo Ngày & Từ khóa tìm kiếm
  const filteredPending = pendingOrders.filter((ord) => {
    const ordDate = ord.readyToPickAt || ord.updatedAt || ord.createdAt;
    const ordIsToday = isToday(ordDate);

    if (scheduleDateFilter === 'TODAY' && !ordIsToday) return false;
    if (scheduleDateFilter === 'PREVIOUS' && ordIsToday) return false;

    if (!searchPendingTerm.trim()) return true;
    const term = searchPendingTerm.toLowerCase();
    const code = (ord.trackingCode || '').toLowerCase();
    const seller = (ord.pickupAddress?.fullName || ord.sellerId?.companyName || ord.sellerId?.fullName || '').toLowerCase();
    const phone = (ord.pickupAddress?.phone || '').toLowerCase();
    const address = (ord.pickupAddress?.address || '').toLowerCase();
    const receiver = (ord.deliveryAddress?.fullName || '').toLowerCase();
    return code.includes(term) || seller.includes(term) || phone.includes(term) || address.includes(term) || receiver.includes(term);
  });

  // Lọc lịch sử gom đơn
  const filteredHistory = history.filter((item) => {
    if (!searchHistoryTerm.trim()) return true;
    const term = searchHistoryTerm.toLowerCase();
    const code = (item.tracking_code || item.trackingCode || '').toLowerCase();
    const seller = (item.seller_name || '').toLowerCase();
    const dest = (item.destination_hub_name || '').toLowerCase();
    return code.includes(term) || seller.includes(term) || dest.includes(term);
  });

  return (
    <div className="flex flex-col gap-4 p-3 max-w-lg mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 pb-20">
      
      {/* Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-base text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-cyan-400" />
            Tài Xế Thu Gom Đơn Hàng
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Lịch thu gom & Quét mã gán đơn tự động
          </p>
        </div>

        <button
          type="button"
          onClick={loadAllDriverData}
          disabled={isSyncingServer}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0 border border-slate-700"
          title="Tải lại danh sách từ hệ thống"
        >
          <RefreshCw className={`w-4 h-4 text-cyan-400 ${isSyncingServer ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Đồng bộ</span>
        </button>
      </div>

      {/* Navigation Tab Bar */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('SCHEDULE')}
          className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'SCHEDULE'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Lịch Gom</span>
          {todayPendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-400 text-slate-950 font-black">
              {todayPendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SCAN')}
          className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTab === 'SCAN'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Quét Gom</span>
          {stagingBatch.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-400 text-slate-950 font-black animate-pulse">
              {stagingBatch.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Đã Lấy</span>
          {history.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-purple-300 font-mono font-bold">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: LỊCH THU GOM ĐƠN HÀNG (PENDING SCHEDULE - READY_TO_PICK) */}
      {activeTab === 'SCHEDULE' && (
        <div className="space-y-3">
          
          {/* Schedule Banner Stats */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between font-bold text-white border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Clock className="w-4 h-4 text-amber-400" /> Nhiệm Vụ Thu Gom Theo Ngày
              </span>
              <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800">
                Hôm Nay: {todayPendingCount} đơn
              </span>
            </div>

            {/* Date Segmented Filter Buttons */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setScheduleDateFilter('TODAY')}
                className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  scheduleDateFilter === 'TODAY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Hôm nay</span>
                <span className="px-1.5 py-0.2 bg-blue-950 text-blue-200 rounded-full text-[10px] font-mono">
                  {todayPendingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScheduleDateFilter('PREVIOUS')}
                className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  scheduleDateFilter === 'PREVIOUS'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Ngày trước</span>
                {previousPendingCount > 0 ? (
                  <span className="px-1.5 py-0.2 bg-amber-950 text-amber-200 rounded-full text-[10px] font-mono font-bold animate-pulse">
                    {previousPendingCount}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 bg-slate-900 text-slate-500 rounded-full text-[10px] font-mono">
                    0
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setScheduleDateFilter('ALL')}
                className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  scheduleDateFilter === 'ALL'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Tất cả</span>
                <span className="px-1.5 py-0.2 bg-slate-950 text-slate-400 rounded-full text-[10px] font-mono">
                  {pendingOrders.length}
                </span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          {pendingOrders.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchPendingTerm}
                onChange={(e) => setSearchPendingTerm(e.target.value)}
                placeholder="Tìm mã đơn, tên Shop, SĐT, địa chỉ lấy..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          )}

          {/* Pending List */}
          {isLoadingPending ? (
            <div className="text-center py-10 space-y-2 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
              <p>Đang tải danh sách đơn hàng cần thu gom...</p>
            </div>
          ) : filteredPending.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-3 p-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-slate-300 text-xs">
                  {scheduleDateFilter === 'TODAY'
                    ? 'Không có đơn hàng nào cần thu gom HÔM NAY'
                    : scheduleDateFilter === 'PREVIOUS'
                    ? 'Không có đơn hàng tồn đọng từ CÁC NGÀY TRƯỚC'
                    : 'Chưa có đơn hàng nào sẵn sàng thu gom'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tất cả đơn hàng của các Shop đã được thu gom hoặc chưa ở trạng thái Sẵn Sàng (READY_TO_PICK).
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((ord) => {
                const isStaged = stagingBatch.includes(ord.trackingCode);
                const ordDate = ord.readyToPickAt || ord.updatedAt || ord.createdAt;
                const ordIsToday = isToday(ordDate);

                const pickupAddressStr = [
                  ord.pickupAddress?.address,
                  ord.pickupAddress?.ward,
                  ord.pickupAddress?.district,
                  ord.pickupAddress?.province,
                ]
                  .filter(Boolean)
                  .join(', ');

                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  pickupAddressStr || 'Vietnam'
                )}`;

                return (
                  <div
                    key={ord.trackingCode || ord._id}
                    className={`bg-slate-900 border rounded-2xl p-4 space-y-3 transition shadow-md ${
                      ordIsToday ? 'border-slate-800 hover:border-slate-700' : 'border-amber-500/40 bg-amber-950/10'
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400 text-sm">{ord.trackingCode}</span>
                        {ordIsToday ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            ✨ Gom Hôm Nay
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            ⚠️ Tồn Từ {new Date(ordDate).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {ord.codAmount > 0 ? (
                          <span className="text-amber-400 font-bold">COD: {ord.codAmount.toLocaleString('vi-VN')}đ</span>
                        ) : (
                          <span className="text-emerald-400">0đ COD</span>
                        )}
                      </span>
                    </div>

                    {/* Sender / Shop Info */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            {ord.pickupAddress?.fullName || ord.sellerId?.companyName || ord.sellerId?.fullName || 'Shop Seller'}
                          </p>
                          {ord.pickupAddress?.phone && (
                            <a
                              href={`tel:${ord.pickupAddress.phone}`}
                              className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] font-mono mt-0.5"
                            >
                              <Phone className="w-3 h-3 text-cyan-400" />
                              {ord.pickupAddress.phone}
                            </a>
                          )}
                        </div>

                        {/* Map Button */}
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Navigation className="w-3 h-3" /> Chỉ đường
                        </a>
                      </div>

                      <p className="text-slate-300 text-[11px] flex items-start gap-1 leading-snug pt-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{pickupAddressStr || 'Địa chỉ kho chưa cập nhật'}</span>
                      </p>
                    </div>

                    {/* Package Info Snippet */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <Box className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-slate-300 truncate max-w-[180px]">
                          {ord.items?.[0]?.name || 'Hàng hóa E-Logistics'}
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono shrink-0">
                        {ord.chargeableWeight || ord.actualWeight || 0.5} kg
                      </span>
                    </div>

                    {/* Action buttons stack */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForDetail(ord)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" /> Xem Chi Tiết
                      </button>

                      <button
                        type="button"
                        disabled={isStaged || loading}
                        onClick={() => {
                          handleInitiatePickup(ord.trackingCode);
                          setActiveTab('SCAN');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-md cursor-pointer ${
                          isStaged
                            ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        }`}
                      >
                        {isStaged ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã Vào Lô Gom
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> Thêm Vào Lô Gom
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUÉT MÃ QR & THÊM VÀO LÔ GOM (SCAN & STAGING) */}
      {activeTab === 'SCAN' && (
        <div className="space-y-4">
          
          {/* Camera Scanner Component */}
          <CameraScanner
            onScanSuccess={handleInitiatePickup}
            isScanning={isCameraActive}
            onToggleScan={setIsCameraActive}
          />

          {/* Manual Input */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-sm space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Hoặc nhập thủ công mã vận đơn:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInitiatePickup(manualCode);
                }}
                placeholder="VD: ELG-VN-55327924..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm uppercase font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => handleInitiatePickup(manualCode)}
                disabled={loading || !manualCode.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Thêm
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Staging Batch Card */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="text-sm">🛍️</span> Giỏ Gom Đơn Tại Shop ({stagingBatch.length} kiện)
              </h3>
              {stagingBatch.length > 0 && (
                <button
                  onClick={() => setStagingBatch([])}
                  className="text-[10px] text-rose-400 hover:underline cursor-pointer font-semibold"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {stagingBatch.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic text-center py-4 bg-slate-950/60 rounded-xl border border-slate-800">
                Chuyển qua tab <strong className="text-slate-300">"Lịch Gom"</strong> bấm chọn đơn hoặc Quét camera QR để đưa kiện hàng vào giỏ này.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                  {stagingBatch.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1.5 bg-blue-950/80 border border-blue-800 text-blue-300 px-2.5 py-1 rounded-xl text-xs font-mono font-bold"
                    >
                      {code}
                      <button
                        onClick={() => handleRemoveFromStaging(code)}
                        className="hover:text-rose-400 cursor-pointer font-sans"
                        title="Xóa đơn này khỏi lô gom"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(true)}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-extrabold transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>✍️</span> Chốt ePOH & Cho Seller Ký Tên ({stagingBatch.length} Đơn)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ĐƠN ĐÃ THU GOM (HISTORY) */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-3">
          
          {/* Search Box History */}
          {history.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchHistoryTerm}
                onChange={(e) => setSearchHistoryTerm(e.target.value)}
                placeholder="Tìm mã vận đơn, tên shop, tỉnh thành..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {filteredHistory.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-500 text-xs italic">
              {history.length === 0
                ? 'Chưa có đơn hàng nào được thu gom trong ca làm việc này.'
                : 'Không tìm thấy đơn hàng trùng khớp.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {filteredHistory.map((item, idx) => {
                const code = item.tracking_code || item.trackingCode;
                return (
                  <div
                    key={code || idx}
                    className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs flex justify-between items-center transition shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400 text-sm">{code}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          Đã Thu Gom
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] flex items-center gap-1 font-medium">
                        <span>Shop:</span> <strong className="text-white">{item.seller_name || 'Shop Kho Hàng'}</strong>
                      </p>
                      {item.destination_hub_name && (
                        <p className="text-slate-400 text-[10px] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
                          <span>Đến: {item.destination_hub_name}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1 text-emerald-400 text-[11px] font-bold mb-1">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>ePOH Ok</span>
                      </div>
                      <p className="text-slate-500 text-[9px] flex items-center justify-end gap-1 font-mono">
                        <Navigation className="w-2.5 h-2.5 text-cyan-500" />
                        {new Date(item.picked_at || Date.now()).toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Status Alert Notification */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2 border shadow-md animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              : statusMsg.type === 'info'
              ? 'bg-blue-950/80 text-cyan-300 border-cyan-800'
              : 'bg-rose-950/80 text-rose-300 border-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : statusMsg.type === 'info' ? (
            <span className="text-cyan-400 shrink-0 mt-0.5 font-bold">ℹ️</span>
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <span className="whitespace-pre-line leading-relaxed">{statusMsg.text}</span>
        </div>
      )}

      {/* Signature Modal */}
      {isSignatureModalOpen && (
        <SellerSignatureModal
          orderCount={stagingBatch.length}
          trackingCode={stagingBatch[0]}
          onConfirm={handleConfirmBatchWithSignature}
          onClose={() => setIsSignatureModalOpen(false)}
        />
      )}

      {/* MODAL XEM CHI TIẾT ĐƠN HÀNG CHO TÀI XẾ */}
      {selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 text-white shadow-2xl max-h-[85vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 font-mono uppercase font-bold block">Chi Tiết Vận Đơn Thu Gom</span>
                <h3 className="text-base font-extrabold text-white font-mono">{selectedOrderForDetail.trackingCode}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetail(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sender / Pickup Info */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Địa Điểm Lấy Hàng (Kho Seller)
              </span>
              <div className="text-xs space-y-1">
                <p className="font-bold text-white">
                  {selectedOrderForDetail.pickupAddress?.fullName || selectedOrderForDetail.sellerId?.companyName || 'Shop Seller'}
                </p>
                {selectedOrderForDetail.pickupAddress?.phone && (
                  <a
                    href={`tel:${selectedOrderForDetail.pickupAddress.phone}`}
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-xs font-bold"
                  >
                    <Phone className="w-3.5 h-3.5" /> {selectedOrderForDetail.pickupAddress.phone}
                  </a>
                )}
                <p className="text-slate-300 text-[11px] leading-relaxed pt-1">
                  {[
                    selectedOrderForDetail.pickupAddress?.address,
                    selectedOrderForDetail.pickupAddress?.ward,
                    selectedOrderForDetail.pickupAddress?.district,
                    selectedOrderForDetail.pickupAddress?.province,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>

            {/* Receiver Info */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Địa Điểm Giao Hàng (Người Nhận)
              </span>
              <div className="text-xs space-y-1">
                <p className="font-bold text-white">{selectedOrderForDetail.deliveryAddress?.fullName}</p>
                <p className="text-slate-400 font-mono text-[11px]">{selectedOrderForDetail.deliveryAddress?.phone}</p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {[
                    selectedOrderForDetail.deliveryAddress?.address,
                    selectedOrderForDetail.deliveryAddress?.ward,
                    selectedOrderForDetail.deliveryAddress?.district,
                    selectedOrderForDetail.deliveryAddress?.province,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>

            {/* Package & Fee details */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5" /> Thông Tin Kiện Hàng
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-400">Sản phẩm:</span>
                  <span className="font-semibold text-white">
                    {selectedOrderForDetail.items?.[0]?.name || 'Hàng tiêu dùng'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-400">Trọng lượng quy đổi:</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {selectedOrderForDetail.chargeableWeight || selectedOrderForDetail.actualWeight || 0.5} kg
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-400">Tiền Thu Hộ COD:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {selectedOrderForDetail.codAmount?.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cước phí giao hàng:</span>
                  <span className="font-mono text-emerald-400">
                    {selectedOrderForDetail.shippingFee?.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForDetail(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => {
                  handleInitiatePickup(selectedOrderForDetail.trackingCode);
                  setSelectedOrderForDetail(null);
                  setActiveTab('SCAN');
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Thêm Đơn Này Vào Lô Gom
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DriverPickupPage;
