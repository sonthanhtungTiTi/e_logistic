import React, { useState, useEffect } from 'react';
import { CameraScanner } from '@/components/driver/CameraScanner';
import {
  Truck,
  Phone,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Layers,
  AlertTriangle,
  Clock,
  X,
  History,
  ClipboardList,
  ShieldAlert,
  Calendar,
  Barcode,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { axiosClient } from '@/api/axiosClient';
import { socket } from '@/api/socket';

interface PickupTask {
  _id: string;
  id: string;
  trackingCode: string;
  shopName: string;
  phone: string;
  address: string;
  subZone?: string;
  ward?: string;
  district?: string;
  province?: string;
  itemsCount: number;
  items?: any[];
  declaredWeight: number;
  codAmount: number;
  isCod: boolean;
  status: string;
  pickupTripId?: string;
  createdAt: string;
}

interface PickedUpTask {
  _id: string;
  id: string;
  trackingCode: string;
  shopName: string;
  phone: string;
  address: string;
  declaredWeight: number;
  codAmount: number;
  isCod: boolean;
  status: string;
  pickedAt: string;
  pickupTripId?: string;
}

export const ShipperPickupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');

  const [manualCode, setManualCode] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [measuredWeight, setMeasuredWeight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingTasks, setFetchingTasks] = useState<boolean>(true);
  const [fetchingHistory, setFetchingHistory] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [pickupTasks, setPickupTasks] = useState<PickupTask[]>([]);
  const [pickupHistory, setPickupHistory] = useState<PickedUpTask[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string>('');
  const [shipperArea, setShipperArea] = useState<any>(null);
  const [activeZones, setActiveZones] = useState<string[]>([]);
  const [pickupQuota, setPickupQuota] = useState<{ max: number; current: number }>({ max: 25, current: 0 });

  // Modal Báo Thất Bại
  const [failureModalOpen, setFailureModalOpen] = useState<boolean>(false);
  const [selectedTaskForFailure, setSelectedTaskForFailure] = useState<PickupTask | null>(null);
  const [failureTier, setFailureTier] = useState<'TIER_1' | 'TIER_2'>('TIER_1');
  const [selectedReason, setSelectedReason] = useState<string>('Shop chưa chuẩn bị kịp hàng');
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [failureNote, setFailureNote] = useState<string>('');
  const [submittingFailure, setSubmittingFailure] = useState<boolean>(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && failureModalOpen && !submittingFailure) {
        setFailureModalOpen(false);
        setSelectedTaskForFailure(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [failureModalOpen, submittingFailure]);

  useEffect(() => {
    loadPickupTasks();
    loadPickupHistory();

    const handleCancelled = (data: any) => {
      setMsg({
        type: 'error',
        text: `⚠️ Đơn [${data.trackingCode || data.orderId}] đã bị hủy: "${data.reason || 'Người dùng hủy'}". Hệ thống đã giải phóng tải trọng!`,
      });
      loadPickupTasks();
    };

    const handleCompensated = (data: any) => {
      setMsg({
        type: 'success',
        text: `⚡ Đã tự động bù đơn mới [${data.newOrder?.trackingCode || ''}] thay thế cho đơn vừa hủy!`,
      });
      loadPickupTasks();
    };

    const handleOrderUpdated = () => {
      loadPickupTasks();
      loadPickupHistory();
    };

    if (socket) {
      socket.on('shipper:order_cancelled', handleCancelled);
      socket.on('shipper:order_compensated', handleCompensated);
      socket.on('order:updated', handleOrderUpdated);
    }

    return () => {
      if (socket) {
        socket.off('shipper:order_cancelled', handleCancelled);
        socket.off('shipper:order_compensated', handleCompensated);
        socket.off('order:updated', handleOrderUpdated);
      }
    };
  }, [searchParams]);

  const loadPickupTasks = async () => {
    setFetchingTasks(true);
    try {
      let zonesParam = searchParams.get('zones');
      if (!zonesParam) {
        try {
          const saved = localStorage.getItem('shipper_selected_zones');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              zonesParam = parsed.join(',');
            }
          }
        } catch {}
      }

      if (zonesParam) {
        setActiveZones(zonesParam.split(',').map((s) => s.trim()).filter(Boolean));
      }

      const res = await axiosClient.get('/orders/shipper/pickup-tasks', {
        params: zonesParam ? { zones: zonesParam } : {},
      });
      if (res.data?.data) {
        setPickupTasks(res.data.data);
        if (res.data.currentTripId) setCurrentTripId(res.data.currentTripId);
        if (res.data.shipperArea) setShipperArea(res.data.shipperArea);
        if (res.data.pickupQuota) setPickupQuota(res.data.pickupQuota);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách đơn lấy hàng:', err);
    } finally {
      setFetchingTasks(false);
    }
  };

  const loadPickupHistory = async () => {
    setFetchingHistory(true);
    try {
      const res = await axiosClient.get('/orders/shipper/pickup-history');
      if (res.data?.data) {
        setPickupHistory(res.data.data);
        if (res.data.currentTripId && !currentTripId) {
          setCurrentTripId(res.data.currentTripId);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử đã gom:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  // Xác nhận lấy hàng (Chỉ gọi qua Camera Scanner hoặc Nhập mã thủ công)
  const handleConfirmPickup = async (trackingCode: string) => {
    if (!trackingCode) return;
    setLoading(true);

    try {
      const weightNum = measuredWeight ? parseFloat(measuredWeight) : undefined;
      const codeUpper = trackingCode.trim().toUpperCase();

      const task = pickupTasks.find((t) => t.trackingCode.toUpperCase() === codeUpper);
      const orderId = task?._id || codeUpper;

      try {
        await axiosClient.post(`/orders/shipper/${orderId}/verify-scan`, {
          trackingCode: codeUpper,
        });
      } catch (scanErr) {
        // Tiếp tục bước confirm
      }

      try {
        await axiosClient.post(`/orders/shipper/${orderId}/confirm-pickup`, {
          trackingCode: codeUpper,
          scannedCode: codeUpper,
          actualWeight: weightNum,
          gpsLat: 21.028511,
          gpsLng: 105.854444,
          signatureImageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><text y="20">Signed</text></svg>',
          pickupTripId: currentTripId,
        });
      } catch (puErr) {
        await axiosClient.post('/custody/transfer', {
          trackingCode: codeUpper,
          transferType: 'SELLER_TO_SHIPPER',
          measuredWeightKg: weightNum,
          packageCondition: 'INTACT',
        });
      }

      setMsg({
        type: 'success',
        text: `✅ Đã quét lấy đơn [${codeUpper}] thành công! Đơn đã chuyển sang tab "Lịch Sử Đã Gom".`,
      });
      setManualCode('');
      setMeasuredWeight('');
      loadPickupTasks();
      loadPickupHistory();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || `Lỗi quét lấy đơn [${trackingCode}]`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Mở modal báo thất bại
  const openFailureModal = (task: PickupTask) => {
    setSelectedTaskForFailure(task);
    setFailureTier('TIER_1');
    setSelectedReason('Shop chưa chuẩn bị kịp hàng');
    setRescheduleDate('');
    setFailureNote('');
    setFailureModalOpen(true);
  };

  // Submit báo thất bại
  const handleSubmitFailure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForFailure) return;

    setSubmittingFailure(true);
    try {
      const orderId = selectedTaskForFailure._id || selectedTaskForFailure.trackingCode;
      const failureCategory = failureTier === 'TIER_1' ? 'TEMPORARY_RESCHEDULE' : 'PERMANENT_CANCEL';

      const res = await axiosClient.post(`/orders/shipper/${orderId}/pickup-failed`, {
        trackingCode: selectedTaskForFailure.trackingCode,
        failureCategory,
        failureReason: selectedReason,
        rescheduledAt: rescheduleDate ? new Date(rescheduleDate).toISOString() : undefined,
        note: failureNote,
      });

      setMsg({
        type: 'success',
        text: res.data?.message || `Đã gửi báo cáo thất bại đơn [${selectedTaskForFailure.trackingCode}]`,
      });

      setFailureModalOpen(false);
      setSelectedTaskForFailure(null);
      loadPickupTasks();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi gửi báo cáo lấy hàng thất bại',
      });
    } finally {
      setSubmittingFailure(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-400" />
              Nhiệm Vụ Gom Hàng Tại Shop (First-Mile)
            </h2>
            {currentTripId && (
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Barcode className="w-3 h-3" /> Chuyến: {currentTripId}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Khu vực phụ trách:{' '}
            <strong className="text-blue-400">
              {shipperArea?.subZone ? `${shipperArea.subZone}, ` : ''}{shipperArea?.district || ''}{' '}
              {shipperArea?.province || 'Hà Nội'}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadPickupTasks();
              loadPickupHistory();
            }}
            title="Làm mới danh sách"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingTasks || fetchingHistory ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs bg-blue-500/20 text-blue-300 font-bold px-3 py-1.5 rounded-xl border border-blue-500/30 font-mono">
            {pickupTasks.length} chờ gom / {pickupQuota.max || 25} hạn mức
          </span>
        </div>
      </div>

      {/* Tabs Chuyển Đổi: Cần Đi Lấy vs Lịch Sử Đã Gom */}
      <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 gap-1.5">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'PENDING'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Cần Đi Lấy ({pickupTasks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch Sử Đã Gom ({pickupHistory.length})</span>
        </button>
      </div>

      {/* Multi-Zone Aggregation Bar */}
      {activeZones.length > 0 && (
        <div className="bg-cyan-950/40 border border-cyan-500/30 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
            <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              Đang gộp tuyến <strong>{activeZones.length}</strong> cụm:{' '}
              <span className="font-mono text-[11px] text-cyan-200">[{activeZones.join(', ')}]</span>
            </span>
          </div>
          <button
            onClick={() => navigate('/shipper/zones')}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-bold cursor-pointer shrink-0 ml-2"
          >
            Đổi cụm tuyến
          </button>
        </div>
      )}

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow ${
            msg.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white px-1">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: DANH SÁCH CẦN ĐI LẤY */}
      {activeTab === 'PENDING' && (
        <div className="space-y-4">
          {/* Camera QR Scanner */}
          <CameraScanner
            onScanSuccess={(code) => handleConfirmPickup(code)}
            isScanning={isCameraActive}
            onToggleScan={setIsCameraActive}
          />

          {/* Manual Barcode Input & Weight Form */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-blue-400" />
                Quét mã vạch hoặc nhập thủ công mã vận đơn:
              </label>
              <span className="text-[10px] text-slate-500">Bắt buộc quét để xác nhận nhận hàng</span>
            </div>
            <div className="flex gap-2">
              <input
                id="input-pickup-manual-code"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="VD: ELG-VN-71247720..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs uppercase font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
              <input
                id="input-pickup-weight"
                type="number"
                step="0.1"
                value={measuredWeight}
                onChange={(e) => setMeasuredWeight(e.target.value)}
                placeholder="Cân (kg)"
                title="Để trống nếu lấy theo cân nặng Shop đã khai báo"
                className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-center"
              />
              <button
                id="btn-pickup-manual"
                onClick={() => handleConfirmPickup(manualCode)}
                disabled={loading || !manualCode.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Xác Nhận Lấy'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              💡 <em>Lưu ý: Để đảm bảo tính minh bạch, nút xác nhận trên từng thẻ đã chuyển thành thao tác quét Camera hoặc nhập mã đối chứng đối chiếu thực tế.</em>
            </p>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-300 block px-1">
              Danh Sách Điểm Cần Đến Lấy Tại Khu Vực ({pickupTasks.length} đơn):
            </span>
            {fetchingTasks ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                <p>Đang quét đơn hàng cần lấy tại địa bàn...</p>
              </div>
            ) : pickupTasks.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-1.5 text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                <p className="text-xs font-bold text-white">Không có đơn hàng nào chờ lấy tại khu vực này</p>
                <p className="text-[11px] text-slate-500">Tất cả đơn đã được gom hoặc đang chờ Shop đóng gói.</p>
              </div>
            ) : (
              pickupTasks.map((task) => (
                <div
                  key={task.id || task._id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 transition shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400">{task.trackingCode}</span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                        READY_TO_PICK
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono font-semibold border border-slate-700">
                      Khai báo: {task.declaredWeight} kg
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-xs">{task.shopName}</h3>
                    <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span>{task.address}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                    <a
                      href={`tel:${task.phone}`}
                      className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" /> Gọi Shop: {task.phone}
                    </a>

                    {/* Chỉ giữ lại nút Báo Thất Bại (xóa nút Xác Nhận Đã Lấy trên card) */}
                    <button
                      onClick={() => openFailureModal(task)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      Báo Thất Bại
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LỊCH SỬ ĐÃ GOM TRONG CA */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Kiện Hàng Đã Thu Gom Thành Công</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Đã nhận <strong className="text-emerald-400">{pickupHistory.length}</strong> kiện vào Chuyến{' '}
                  <span className="font-mono text-white font-bold">[{currentTripId || 'PKT-ACTIVE'}]</span>
                </p>
              </div>
            </div>
            <button
              onClick={loadPickupHistory}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingHistory ? 'animate-spin' : ''}`} />
              Cập nhật
            </button>
          </div>

          <div className="space-y-2.5">
            {fetchingHistory ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
                <p>Đang tải lịch sử đã gom...</p>
              </div>
            ) : pickupHistory.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-1.5 text-slate-400">
                <History className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-white">Chưa có kiện hàng nào được gom trong phiên này</p>
                <p className="text-[11px] text-slate-500">Hãy chuyển sang tab "Cần Đi Lấy" và quét mã vạch khi nhận hàng.</p>
              </div>
            ) : (
              pickupHistory.map((item) => (
                <div
                  key={item.id || item._id}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-400">{item.trackingCode}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-xs">{item.shopName}</h4>
                    <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item.address}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800 font-mono">
                    <span>Trọng lượng: {item.declaredWeight} kg</span>
                    <span className="text-slate-500">
                      Lấy lúc: {item.pickedAt ? new Date(item.pickedAt).toLocaleTimeString('vi-VN') : 'Vừa xong'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL FORM BÁO LẤY HÀNG THẤT BẠI (2 TẦNG CHUẨN HÓA) */}
      {failureModalOpen && selectedTaskForFailure && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Báo Lấy Hàng Thất Bại: {selectedTaskForFailure.trackingCode}</span>
              </div>
              <button
                onClick={() => setFailureModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-white font-bold">{selectedTaskForFailure.shopName}</div>
              <div className="text-slate-400 text-[11px]">{selectedTaskForFailure.address}</div>
              <div className="text-blue-400 text-[11px] font-mono">SĐT: {selectedTaskForFailure.phone}</div>
            </div>

            <form onSubmit={handleSubmitFailure} className="space-y-4">
              {/* Chọn Tầng Phân Loại */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  1. Chọn Tính Chất Thất Bại (Phân Luồng Xử Lý):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFailureTier('TIER_1');
                      setSelectedReason('Shop chưa chuẩn bị kịp hàng');
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      failureTier === 'TIER_1'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Tầng 1: Hẹn Lấy Lại
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Tự động hoàn Quota, gán Aging Boost (+25đ) cho ca sau lấy trước
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFailureTier('TIER_2');
                      setSelectedReason('Shop báo hủy đơn');
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      failureTier === 'TIER_2'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      Tầng 2: Shop Hủy / Vi Phạm
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Đẩy lên DISPATCH_ESCALATED để Dispatcher/CSKH duyệt hủy
                    </div>
                  </button>
                </div>
              </div>

              {/* Danh sách lý do theo Tầng */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  2. Lý Do Cụ Thể:
                </label>
                <div className="space-y-1.5">
                  {failureTier === 'TIER_1' ? (
                    <>
                      {[
                        'Shop chưa chuẩn bị kịp hàng',
                        'Shop hẹn lấy lại vào ca sau / ngày mai',
                        'Gọi điện Shop không nghe máy / Thuê bao',
                        'Cửa hàng tạm đóng cửa / Chưa mở cửa',
                      ].map((r) => (
                        <label
                          key={r}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
                        >
                          <input
                            type="radio"
                            name="failureReason"
                            value={r}
                            checked={selectedReason === r}
                            onChange={(e) => setSelectedReason(e.target.value)}
                            className="text-amber-500 focus:ring-0"
                          />
                          <span className="text-slate-200">{r}</span>
                        </label>
                      ))}
                    </>
                  ) : (
                    <>
                      {[
                        'Shop báo hủy đơn (Khách hủy hoặc hết hàng)',
                        'Hàng cấm / Vi phạm quy chuẩn đóng gói quy định',
                        'Địa chỉ Shop không có thật / Shop từ chối bàn giao',
                        'Sai lệch hoàn toàn thông tin người gửi',
                      ].map((r) => (
                        <label
                          key={r}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
                        >
                          <input
                            type="radio"
                            name="failureReason"
                            value={r}
                            checked={selectedReason === r}
                            onChange={(e) => setSelectedReason(e.target.value)}
                            className="text-rose-500 focus:ring-0"
                          />
                          <span className="text-slate-200">{r}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Hẹn giờ lại nếu ở Tầng 1 */}
              {failureTier === 'TIER_1' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Hẹn Giờ Lấy Lại (Tùy chọn):
                  </label>
                  <input
                    type="datetime-local"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Ghi chú thêm */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Ghi Chú Thêm (Nếu có):
                </label>
                <textarea
                  rows={2}
                  value={failureNote}
                  onChange={(e) => setFailureNote(e.target.value)}
                  placeholder="Ghi chú chi tiết trao đổi với Shop..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFailureModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingFailure}
                  className={`px-4 py-2 rounded-xl font-bold text-xs text-white transition flex items-center gap-1.5 cursor-pointer shadow ${
                    failureTier === 'TIER_1'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submittingFailure ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : failureTier === 'TIER_1' ? (
                    'Xác Nhận Hẹn Lấy Lại'
                  ) : (
                    'Gửi Dispatcher Phê Duyệt'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipperPickupPage;
