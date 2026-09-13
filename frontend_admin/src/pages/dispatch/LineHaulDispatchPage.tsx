import React, { useState, useEffect } from 'react';
import {
  Truck,
  Boxes,
  Plus,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { axiosClient } from '../../api/axiosClient';
import { InventorySuggestionsPanel } from '../../components/warehouse/InventorySuggestionsPanel';

interface Driver {
  _id: string;
  fullName: string;
  phoneNumber: string;
  vehicleInfo?: { licensePlate: string; vehicleType: string };
  isWorking: boolean;
}

interface SealedBag {
  _id: string;
  sealCode: string;
  originHubId: { name: string; code: string };
  destinationHubId: { name: string; code: string };
  trackingCodes: string[];
  totalWeightKg: number;
}

interface Trip {
  _id: string;
  tripCode: string;
  originHubId: { name: string; code: string; province: string };
  destinationHubId: { name: string; code: string; province: string };
  driverId?: { fullName: string; phoneNumber: string; vehicleInfo?: { licensePlate: string; vehicleType: string } };
  plannedTrackingCodes: string[];
  status: string;
  createdAt: string;
}

export const LineHaulDispatchPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [sealedBags, setSealedBags] = useState<SealedBag[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [tripCode, setTripCode] = useState<string>('');
  const [originHub, setOriginHub] = useState<string>('');
  const [destHub, setDestHub] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedBagIds, setSelectedBagIds] = useState<string[]>([]);

  useEffect(() => {
    loadLinehaulData();
  }, []);

  const loadLinehaulData = async () => {
    setLoading(true);
    try {
      const [tripRes, bagRes, drvRes] = await Promise.all([
        axiosClient.get('/dispatch/linehaul/trips'),
        axiosClient.get('/dispatch/linehaul/sealed-bags'),
        axiosClient.get('/dispatch/linehaul/drivers'),
      ]);

      setTrips(tripRes.data?.data || []);
      setSealedBags(bagRes.data?.data || []);
      setDrivers(drvRes.data?.data || []);
    } catch (err) {
      console.warn('Lỗi tải dữ liệu Linehaul Dispatch:', err);
      setTrips([]);
      setSealedBags([]);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripCode) {
      setMsg({ type: 'error', text: 'Vui lòng nhập mã chuyến xe' });
      return;
    }

    try {
      await axiosClient.post('/dispatch/linehaul/trips', {
        tripCode,
        originHubId: originHub || '60d0fe4f5311236168a109ca',
        destinationHubId: destHub || '60d0fe4f5311236168a109cb',
        driverId: selectedDriverId || undefined,
        bagIds: selectedBagIds,
      });

      setMsg({ type: 'success', text: `✅ Đã lập chuyến xe [${tripCode}] thành công` });
      setIsModalOpen(false);
      setTripCode('');
      setSelectedBagIds([]);
      loadLinehaulData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi lập chuyến xe' });
    }
  };

  const totalTrips = trips.length;
  const totalBags = sealedBags.length;
  const activeDriversCount = drivers.filter(d => d.isWorking).length;
  const activeTripsCount = trips.filter(t => t.status === 'IN_TRANSIT' || t.status === 'CREATED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* TẦNG 1: Page Header & KPI Summary Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Điều Phối Xe Tải (QL 3)</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Gom bao niêm phong (Bagging), lập kế hoạch tuyến đường &amp; điều động tài xế xe tải chặng trung chuyển
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTripCode(`TRIP-${Math.floor(100000 + Math.random() * 900000)}`);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Lập Chuyến Xe Mới
            </button>
            <button
              onClick={loadLinehaulData}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} /> Tải Lại Dữ Liệu
            </button>
          </div>
        </div>

        {/* 4 Thẻ KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Chuyến Xe</span>
              <span className="text-2xl font-black text-white mt-1 block font-mono">{totalTrips}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Bao Niêm Phong Chờ</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block font-mono">{totalBags}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Boxes className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tài Xế Khả Dụng</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">{activeDriversCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Chuyến Đang Chạy</span>
              <span className="text-2xl font-black text-cyan-400 mt-1 block font-mono">{activeTripsCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* CẢNH BÁO TỒN KHO & ĐỀ XUẤT GOM CHUYẾN XE (SMART INVENTORY TRIP SUGGESTIONS) */}
      <InventorySuggestionsPanel onTripCreated={loadLinehaulData} />

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Grid: Ready Sealed Bags */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white text-sm">Bao Hàng Niêm Phong Sẵn Sàng Xếp Lên Xe</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{sealedBags.length} bao chờ chuyến</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sealedBags.map((bag) => (
            <div
              key={bag._id}
              className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-400">{bag.sealCode}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                  SEALED
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>{bag.originHubId?.code}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-cyan-400 font-bold">{bag.destinationHubId?.code}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-850">
                <span>Số kiện: {bag.trackingCodes?.length || 0}</span>
                <span>Khối lượng: {bag.totalWeightKg} kg</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white text-sm">Danh Sách Chuyến Xe Trung Chuyển (Trips)</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Tổng: {trips.length} chuyến</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800">
            <tr>
              <th className="p-3.5">Mã Chuyến Xe</th>
              <th className="p-3.5">Lộ Trình (Kho Xuất → Kho Nhận)</th>
              <th className="p-3.5">Tài Xế & Phương Tiện</th>
              <th className="p-3.5">Số Lượng Vận Đơn</th>
              <th className="p-3.5 text-right">Trạng Thái Chuyến</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {trips.map((trip) => (
              <tr key={trip._id} className="hover:bg-slate-800/30 transition">
                <td className="p-3.5 font-mono font-bold text-white">{trip.tripCode}</td>

                <td className="p-3.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <span>{trip.originHubId?.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-cyan-400">{trip.destinationHubId?.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {trip.originHubId?.province} → {trip.destinationHubId?.province}
                  </div>
                </td>

                <td className="p-3.5">
                  {trip.driverId ? (
                    <div>
                      <div className="font-semibold text-slate-200">{trip.driverId.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {trip.driverId.phoneNumber} • {trip.driverId.vehicleInfo?.licensePlate} ({trip.driverId.vehicleInfo?.vehicleType})
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Chưa gán tài xế</span>
                  )}
                </td>

                <td className="p-3.5 font-bold text-slate-300 font-mono">
                  {trip.plannedTrackingCodes?.length || 0} kiện hàng
                </td>

                <td className="p-3.5 text-right">
                  <span
                    className={`inline-block text-[10px] px-2.5 py-1 rounded-lg font-bold border ${
                      trip.status === 'DEPARTED'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : trip.status === 'LOCKED_PENDING_DRIVER_CONFIRM'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {trip.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                Lập Chuyến Xe Trung Chuyển Mới
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mã Chuyến Xe:</label>
                <input
                  type="text"
                  value={tripCode}
                  onChange={(e) => setTripCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kho Xuất Phát:</label>
                  <select
                    value={originHub}
                    onChange={(e) => setOriginHub(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Kho Tổng Sài Gòn (HUB_SGN)</option>
                    <option value="hub_tb">Kho Tân Bình (HUB_TB)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kho Đích Đến:</label>
                  <select
                    value={destHub}
                    onChange={(e) => setDestHub(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Kho Tổng Hà Nội (HUB_HAN)</option>
                    <option value="hub_dad">Kho Đà Nẵng (HUB_DAD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Gán Tài Xế Xe Tải:</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Chọn tài xế xe tải trực ca --</option>
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.fullName} ({d.phoneNumber}) - {d.vehicleInfo?.vehicleType || 'Xe tải'} [{d.vehicleInfo?.licensePlate || 'N/A'}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/20"
                >
                  Xác Nhận Tạo Chuyến
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineHaulDispatchPage;
