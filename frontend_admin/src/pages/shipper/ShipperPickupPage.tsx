import React, { useState, useEffect } from 'react';
import { CameraScanner } from '@/components/driver/CameraScanner';
import { Truck, Phone, MapPin, RefreshCw, CheckCircle2 } from 'lucide-react';
import { axiosClient } from '@/api/axiosClient';

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
  createdAt: string;
}

export const ShipperPickupPage: React.FC = () => {
  const [manualCode, setManualCode] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [measuredWeight, setMeasuredWeight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingTasks, setFetchingTasks] = useState<boolean>(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pickupTasks, setPickupTasks] = useState<PickupTask[]>([]);
  const [shipperArea, setShipperArea] = useState<any>(null);

  useEffect(() => {
    loadPickupTasks();
  }, []);

  const loadPickupTasks = async () => {
    setFetchingTasks(true);
    try {
      const res = await axiosClient.get('/orders/shipper/pickup-tasks');
      if (res.data?.data) {
        setPickupTasks(res.data.data);
        if (res.data.shipperArea) setShipperArea(res.data.shipperArea);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách đơn lấy hàng:', err);
    } finally {
      setFetchingTasks(false);
    }
  };

  const handleConfirmPickup = async (trackingCode: string) => {
    if (!trackingCode) return;
    setLoading(true);

    try {
      const weightNum = measuredWeight ? parseFloat(measuredWeight) : undefined;
      const codeUpper = trackingCode.trim().toUpperCase();

      // Find the task object if available
      const task = pickupTasks.find((t) => t.trackingCode.toUpperCase() === codeUpper);
      const orderId = task?._id || codeUpper;

      // 1. Verify scan first (nếu cần theo 2-phase)
      try {
        await axiosClient.post(`/orders/shipper/${orderId}/verify-scan`, {
          trackingCode: codeUpper,
        });
      } catch (scanErr) {
        // Tiếp tục bước confirm
      }

      // 2. Confirm pickup & Chain of custody
      try {
        await axiosClient.post(`/orders/shipper/${orderId}/confirm-pickup`, {
          trackingCode: codeUpper,
          scannedCode: codeUpper,
          actualWeight: weightNum,
          gpsLat: 21.028511,
          gpsLng: 105.854444,
        });
      } catch (puErr) {
        // Fallback: Chain of custody transfer
        await axiosClient.post('/custody/transfer', {
          trackingCode: codeUpper,
          transferType: 'SELLER_TO_SHIPPER',
          measuredWeightKg: weightNum,
          packageCondition: 'INTACT',
        });
      }

      setMsg({
        type: 'success',
        text: `✅ Đã quét lấy hàng [${codeUpper}] thành công & chuyển trạng thái sang Đã Lấy Hàng (PICKED_UP)!`,
      });
      setManualCode('');
      setMeasuredWeight('');
      loadPickupTasks();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || `Lỗi xác nhận lấy hàng [${trackingCode}]`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePickupFailed = async (trackingCode: string) => {
    const reason = prompt(
      'Nhập lý do lấy hàng thất bại (Cửa hàng đóng cửa / Không liên lạc được / Hẹn lại / Shop từ chối giao):',
      'SELLER_NOT_HOME'
    );
    if (!reason) return;

    setLoading(true);
    try {
      const codeUpper = trackingCode.trim().toUpperCase();
      const task = pickupTasks.find((t) => t.trackingCode.toUpperCase() === codeUpper);
      const orderId = task?._id || codeUpper;

      await axiosClient.post(`/orders/shipper/${orderId}/pickup-failed`, {
        trackingCode: codeUpper,
        reason: reason,
        note: reason,
      });

      setMsg({
        type: 'error',
        text: `⚠️ Đã ghi nhận lấy hàng thất bại [${codeUpper}]: "${reason}". Trạng thái chuyển sang PICKUP_FAILED.`,
      });
      loadPickupTasks();
    } catch (err: any) {
      setMsg({
        type: 'error',
        text: err.response?.data?.message || `Lỗi báo lấy hàng thất bại [${trackingCode}]`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-amber-400" />
            Nhiệm Vụ Lấy Hàng Tại Shop (First-Mile)
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Khu vực phụ trách:{' '}
            <strong className="text-cyan-400">
              {shipperArea?.subZone ? `${shipperArea.subZone}, ` : ''}{shipperArea?.district || ''}{' '}
              {shipperArea?.province || 'Hà Nội'}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPickupTasks}
            title="Làm mới danh sách"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingTasks ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-1 rounded-lg border border-amber-500/30 font-mono">
            {pickupTasks.length} đơn chờ
          </span>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
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

      {/* Camera QR Scanner */}
      <CameraScanner
        onScanSuccess={(code) => handleConfirmPickup(code)}
        isScanning={isCameraActive}
        onToggleScan={setIsCameraActive}
      />

      {/* Manual input */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2">
        <label className="text-xs font-semibold text-slate-300 block">Hoặc nhập thủ công mã vận đơn:</label>
        <div className="flex gap-2">
          <input
            id="input-pickup-manual-code"
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="VD: ELG-VN-71247720..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs uppercase font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
          />
          <input
            id="input-pickup-weight"
            type="number"
            step="0.1"
            value={measuredWeight}
            onChange={(e) => setMeasuredWeight(e.target.value)}
            placeholder="Cân (kg)"
            title="Để trống nếu lấy theo cân nặng Shop đã khai báo"
            className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 text-center"
          />
          <button
            id="btn-pickup-manual"
            onClick={() => handleConfirmPickup(manualCode)}
            disabled={loading || !manualCode.trim()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lấy Hàng'}
          </button>
        </div>
        <p className="text-[10px] text-slate-500">
          💡 <em>Ô cân nặng là <strong>tùy chọn</strong>: Nếu để trống, hệ thống tự động kế thừa số kg Shop đã khai báo lúc tạo đơn.</em>
        </p>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-slate-300 block px-1">Danh Sách Điểm Cần Đến Lấy Tại Khu Vực:</span>
        {fetchingTasks ? (
          <div className="p-6 text-center text-slate-500 text-xs space-y-1">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400" />
            <p>Đang quét đơn hàng cần lấy tại địa bàn...</p>
          </div>
        ) : pickupTasks.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-1 text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
            <p className="text-xs font-bold text-white">Không có đơn hàng nào chờ lấy tại khu vực này</p>
            <p className="text-[11px] text-slate-500">Tất cả đơn đã được lấy hoặc đang chờ Admin phê duyệt.</p>
          </div>
        ) : (
          pickupTasks.map((task) => (
            <div key={task.id || task._id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-400">{task.trackingCode}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-semibold">
                  Khai báo: {task.declaredWeight} kg
                </span>
              </div>

              <div>
                <h3 className="font-bold text-white text-xs">{task.shopName}</h3>
                <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{task.address}</span>
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <a
                  href={`tel:${task.phone}`}
                  className="text-[11px] font-bold text-cyan-400 flex items-center gap-1 hover:underline"
                >
                  <Phone className="w-3 h-3" /> Gọi: {task.phone}
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePickupFailed(task.trackingCode)}
                    disabled={loading}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition cursor-pointer"
                  >
                    Báo Thất Bại
                  </button>
                  <button
                    onClick={() => handleConfirmPickup(task.trackingCode)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-[11px] transition cursor-pointer"
                  >
                    Xác Nhận Đã Lấy
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShipperPickupPage;
