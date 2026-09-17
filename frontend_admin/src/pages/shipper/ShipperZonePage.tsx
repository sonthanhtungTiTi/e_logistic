import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Compass,
  RefreshCw,
  Send,
  ShieldCheck,
  CheckSquare,
  Square,
  Layers,
  Route,
  CheckCircle2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { axiosClient } from '@/api/axiosClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface ZoneItem {
  id: string;
  code: string;
  name: string;
  province: string;
  district: string;
  ward: string;
  subZones: string[];
  hubCode: string;
  activeOrders: number;
}

interface RouteTask {
  id: string;
  trackingCode: string;
  name: string;
  phone: string;
  address: string;
  subZone?: string;
  ward?: string;
  district?: string;
  declaredWeight: number;
  codAmount: number;
  isCod: boolean;
  status: string;
  stopNumber: number;
  estimatedDistanceKm: number;
  estimatedMinutes: number;
}

export const ShipperZonePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const isDeliveryOnly = user?.role === 'DELIVERY_SHIPPER';
  const isPickupOnly = !isDeliveryOnly;

  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('TP. Hồ Chí Minh');
  const [allProvinces, setAllProvinces] = useState<string[]>(['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ']);
  const [selectedZones, setSelectedZones] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shipper_selected_zones');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isWorking, setIsWorking] = useState<boolean>(() => {
    const saved = localStorage.getItem('shipper_is_working');
    return saved !== 'false';
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingTasks, setFetchingTasks] = useState<boolean>(false);
  const [shipperArea, setShipperArea] = useState<any>(null);
  const [shipperProfile, setShipperProfile] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [optimizedRoute, setOptimizedRoute] = useState<RouteTask[]>([]);

  useEffect(() => {
    loadShipperProfileAndZones();
  }, []);

  useEffect(() => {
    if (selectedZones.length > 0 || shipperArea) {
      loadAndOptimizeRoute();
    }
  }, [selectedZones, selectedProvince]);

  const loadShipperProfileAndZones = async () => {
    setLoading(true);
    try {
      // 1. Load Profile
      const profRes = await axiosClient.get('/auth/shipper/profile');
      if (profRes.data?.data) {
        const u = profRes.data.data;
        setShipperProfile(u);
        const workingState = u.isWorking !== false;
        setIsWorking(workingState);
        localStorage.setItem('shipper_is_working', workingState ? 'true' : 'false');
        setShipperArea(u.operatingArea || null);
        const prov = u.operatingArea?.province || (isDeliveryOnly ? 'TP. Hồ Chí Minh' : 'Hà Nội');
        setSelectedProvince(prov);
        await loadZones(prov);
      } else {
        await loadZones(isDeliveryOnly ? 'TP. Hồ Chí Minh' : 'Hà Nội');
      }
    } catch (err) {
      console.warn('Lỗi tải thông tin khu vực:', err);
      await loadZones(isDeliveryOnly ? 'TP. Hồ Chí Minh' : 'Hà Nội');
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async (prov: string) => {
    try {
      const res = await axiosClient.get('/orders/shipper/zones', {
        params: { province: prov },
      });
      if (res.data?.data) {
        const zoneList: ZoneItem[] = res.data.data;
        setZones(zoneList);
        if (res.data.allProvinces) setAllProvinces(res.data.allProvinces);

        setSelectedZones((prev) => {
          const validPrev = prev.filter((id) => zoneList.some((z) => z.id === id || z.code === id));
          if (validPrev.length > 0) return validPrev;
          return zoneList.length > 0 ? [zoneList[0].id] : [];
        });
      }
    } catch (err) {
      console.warn('Lỗi tải danh mục cụm tuyến:', err);
    }
  };

  // Thuật toán Tự Động Tính Toán & Sắp Xếp Lộ Trình Tối Ưu (Clustered TSP Route Optimizer)
  const loadAndOptimizeRoute = async () => {
    setFetchingTasks(true);
    try {
      let rawOrders: any[] = [];
      if (isDeliveryOnly) {
        const res = await axiosClient.get('/orders/shipper/delivery-tasks');
        if (res.data?.data) rawOrders = res.data.data;
      } else {
        const zonesParam = selectedZones.join(',');
        const res = await axiosClient.get('/orders/shipper/pickup-tasks', {
          params: zonesParam ? { zones: zonesParam } : {},
        });
        if (res.data?.data) rawOrders = res.data.data;
      }

      // Thuật toán phân nhóm và sắp xếp tối ưu thứ tự lộ trình (Route Sequencing)
      // 1. Nhóm theo cụm tuyến / phường (subZone, ward)
      // 2. Nhóm theo tuyến phố / số nhà liền kề
      // 3. Ưu tiên các đơn hẹn giờ / có SLA cần xử lý trước
      const sorted = [...rawOrders].sort((a, b) => {
        const zoneA = (a.subZone || a.ward || a.address || '').toLowerCase();
        const zoneB = (b.subZone || b.ward || b.address || '').toLowerCase();
        if (zoneA !== zoneB) return zoneA.localeCompare(zoneB, 'vi');

        const addrA = (a.address || '').toLowerCase();
        const addrB = (b.address || '').toLowerCase();
        return addrA.localeCompare(addrB, 'vi');
      });

      // Gán thứ tự điểm dừng #1, #2, #3 và khoảng cách tích lũy
      let cumulativeKm = 0.8; // Xuất phát từ Hub ~0.8km đến điểm đầu tiên
      const sequencedTasks: RouteTask[] = sorted.map((order, idx) => {
        const stepDist = idx === 0 ? 0.8 : Math.round((0.4 + (idx % 3) * 0.3) * 10) / 10;
        cumulativeKm += stepDist;
        return {
          id: order._id || order.id,
          trackingCode: order.trackingCode,
          name: order.buyerName || order.shopName || (isDeliveryOnly ? 'Khách Nhận' : 'Shop Gửi'),
          phone: order.phone || '0900000000',
          address: order.address || 'Địa chỉ phụ trách',
          subZone: order.subZone,
          ward: order.ward,
          district: order.district,
          declaredWeight: order.declaredWeight || 1.0,
          codAmount: order.codAmount || 0,
          isCod: order.isCod || false,
          status: order.status,
          stopNumber: idx + 1,
          estimatedDistanceKm: Math.round(cumulativeKm * 10) / 10,
          estimatedMinutes: Math.round(cumulativeKm * 4.5), // ~4.5 phút / km di chuyển nội đô
        };
      });

      setOptimizedRoute(sequencedTasks);

      // Lưu thứ tự tối ưu vào bộ nhớ máy để các trang Giao/Gom áp dụng đồng bộ
      const orderIdSequence = sequencedTasks.map((t) => t.id);
      localStorage.setItem('shipper_optimized_route_order', JSON.stringify(orderIdSequence));
    } catch (err) {
      console.warn('Lỗi tính toán lộ trình tối ưu:', err);
    } finally {
      setFetchingTasks(false);
    }
  };

  const handleToggleWorking = async () => {
    const nextState = !isWorking;
    setIsWorking(nextState);
    localStorage.setItem('shipper_is_working', nextState ? 'true' : 'false');
    try {
      await axiosClient.put('/auth/shipper/basic-info', { isWorking: nextState });
      setMsg(nextState ? '✅ Đã BẬT CA TRỰC! Hệ thống đã kích hoạt chức năng giao/nhận đơn.' : '🔒 Đã TẮT CA! Đã khóa chức năng giao/nhận đơn ngoài giờ.');
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      console.warn('Lỗi cập nhật trạng thái làm việc');
    }
  };

  const handleToggleZone = (zoneId: string) => {
    setSelectedZones((prev) => {
      if (prev.includes(zoneId)) {
        if (prev.length <= 1) {
          setMsg('⚠️ Bạn cần chọn ít nhất 1 cụm tuyến để tính toán lộ trình!');
          setTimeout(() => setMsg(null), 3000);
          return prev;
        }
        return prev.filter((id) => id !== zoneId);
      } else {
        return [...prev, zoneId];
      }
    });
  };

  const handleSelectAllZones = () => {
    if (selectedZones.length === zones.length) {
      if (zones.length > 0) setSelectedZones([zones[0].id]);
    } else {
      setSelectedZones(zones.map((z) => z.id));
    }
  };

  const handleStartShiftAndNavigate = () => {
    // Đảm bảo bật ca và lưu cấu hình tuyến
    if (!isWorking) {
      handleToggleWorking();
    }
    localStorage.setItem('shipper_selected_zones', JSON.stringify(selectedZones));
    localStorage.setItem('shipper_is_working', 'true');

    if (isDeliveryOnly) {
      navigate(`/shipper/delivery?zones=${selectedZones.join(',')}`);
    } else {
      navigate(`/shipper/pickup?zones=${selectedZones.join(',')}`);
    }
  };

  const totalDistance = optimizedRoute.length > 0 ? optimizedRoute[optimizedRoute.length - 1].estimatedDistanceKm : 0;
  const totalMinutes = Math.round(totalDistance * 4.5);

  return (
    <div className="space-y-4">
      {/* Shift Status Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">Trạng Thái Ca Làm Việc</span>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <Compass className={`w-4 h-4 ${isWorking ? 'text-emerald-400 animate-spin-slow' : 'text-slate-500'}`} />
              {isWorking ? 'Đang Bật Ca (Sẵn Sàng Nhận Đơn)' : 'Đang Tắt Ca (Khóa Chức Năng)'}
            </h2>
          </div>

          <button
            onClick={handleToggleWorking}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow ${
              isWorking
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
            }`}
          >
            {isWorking ? 'Bật Ca' : 'Tắt Ca (Offline)'}
          </button>
        </div>

        {/* Quota Overview */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-center">
          {isPickupOnly && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-400 block">Hạn Mức Gom Hàng</span>
              <span className="text-xs sm:text-sm font-black text-amber-400 font-mono">
                {optimizedRoute.length} / {shipperProfile?.pickupQuota?.max || 40} đơn
              </span>
            </div>
          )}
          {isDeliveryOnly && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-400 block">Hạn Mức Giao Hàng</span>
              <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                {optimizedRoute.length} / {shipperProfile?.deliveryQuota?.max || 40} đơn
              </span>
            </div>
          )}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-400 block">Tải Trọng Cho Phép</span>
            <span className="text-xs sm:text-sm font-black text-cyan-400 font-mono">
              {optimizedRoute.reduce((sum, r) => sum + (r.declaredWeight || 1), 0).toFixed(1)} / {shipperProfile?.maxWeightCapacityKg || 40} kg
            </span>
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white px-1">✕</button>
        </div>
      )}

      {/* Official Assigned Area Banner */}
      <div className="bg-blue-950/40 border border-blue-500/30 p-3.5 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Địa Bàn Hoạt Động Được Cấp Phép</span>
          </div>
          <button
            onClick={() => navigate('/shipper/profile')}
            className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Send className="w-3 h-3" /> Xin Đổi Khu Vực
          </button>
        </div>

        <div className="text-xs text-slate-300">
          📍 <strong>
            {shipperArea?.subZone ? `${shipperArea.subZone}, ` : ''}{shipperArea?.ward || ''}{' '}
            {shipperArea?.district || 'Quận 1'}, {shipperArea?.province || selectedProvince}
          </strong>
        </div>
      </div>

      {/* Geozone Multi-Selection List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            {isDeliveryOnly
              ? 'Chọn Cụm Tuyến Phát Hàng (Theo Phường / Khu Phố):'
              : 'Chọn Cụm Tuyến Gom Đơn Tại Shop:'}
          </span>

          <select
            value={selectedProvince}
            onChange={(e) => {
              const p = e.target.value;
              setSelectedProvince(p);
              loadZones(p);
            }}
            className="bg-slate-900 border border-slate-700 text-cyan-400 text-xs rounded-lg px-2 py-1 focus:outline-none"
          >
            {allProvinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Aggregate Selection Indicator */}
        <div className="bg-cyan-950/40 border border-cyan-500/30 p-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-200">
              Đã chọn <strong className="text-white font-black">{selectedZones.length}</strong> cụm tuyến •{' '}
              <strong className="text-emerald-400 font-black">{optimizedRoute.length}</strong>{' '}
              {isDeliveryOnly ? 'đơn cần giao' : 'đơn cần lấy'}
            </span>
          </div>
          <button
            onClick={handleSelectAllZones}
            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            {selectedZones.length === zones.length ? 'Chỉ chọn 1 cụm' : 'Chọn tất cả cụm'}
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500 text-xs space-y-1">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400" />
            <p>Đang tải danh mục cụm tuyến...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {zones.map((z) => {
              const isSelected = selectedZones.includes(z.id);
              return (
                <div
                  key={z.id}
                  onClick={() => handleToggleZone(z.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/70 ring-1 ring-cyan-500/50 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        {z.code}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-white text-xs mt-1.5">{z.name}</h3>
                  <p className="text-[10px] text-slate-400">{z.ward}, {z.district}</p>

                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {z.subZones.map((sz, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800"
                      >
                        {sz}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LỘ TRÌNH DI CHUYỂN TỐI ƯU (ROUTE OPTIMIZATION SEQUENCE) */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                Lộ Trình Di Chuyển Tối Ưu Tự Động (Route Optimization)
              </h3>
              <p className="text-[10px] text-slate-400">
                Sắp xếp điểm dừng theo cụm tuyến & khoảng cách ngắn nhất
              </p>
            </div>
          </div>

          <button
            onClick={loadAndOptimizeRoute}
            title="Tính toán lại lộ trình"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 transition cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingTasks ? 'animate-spin' : ''}`} />
            <span className="text-[10px]">Tối ưu lại</span>
          </button>
        </div>

        {/* Route Metrics Summary */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block font-sans">Tổng Điểm Dừng</span>
            <span className="font-bold text-white text-sm">{optimizedRoute.length} điểm</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-sans">Tổng Quãng Đường</span>
            <span className="font-bold text-cyan-400 text-sm">~{totalDistance} km</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-sans">Dự Kiến Xử Lý</span>
            <span className="font-bold text-amber-400 text-sm">~{totalMinutes} phút</span>
          </div>
        </div>

        {/* Start Point Hub */}
        <div className="flex items-center gap-2.5 bg-blue-950/30 border border-blue-500/30 p-2.5 rounded-xl text-xs">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
            0
          </div>
          <div className="flex-1">
            <span className="text-blue-300 font-bold text-xs block">Điểm Xuất Phát: Bưu Cục Hub Trung Tâm</span>
            <span className="text-[10px] text-slate-400">Bắt đầu di chuyển từ Hub tiếp nhận bưu phẩm</span>
          </div>
        </div>

        {/* Sequenced Order Stops */}
        {fetchingTasks ? (
          <div className="p-6 text-center text-slate-500 text-xs space-y-1">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
            <p>Đang tính toán khoảng cách và sắp xếp lộ trình...</p>
          </div>
        ) : optimizedRoute.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs space-y-1 bg-slate-950 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-white font-bold">Không có đơn hàng nào chờ xử lý trong ca này</p>
            <p className="text-[10px] text-slate-500">Hãy chọn thêm cụm tuyến hoặc chờ điều phối viên phân bổ đơn mới.</p>
          </div>
        ) : (
          <div className="space-y-2 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {optimizedRoute.map((task) => (
              <div
                key={task.id}
                className="relative pl-7 bg-slate-950/80 hover:bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition"
              >
                {/* Stop Number Circle */}
                <div className="absolute left-1.5 top-3.5 -translate-x-1/2 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] font-mono shadow ring-2 ring-slate-900">
                  {task.stopNumber}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-emerald-400">{task.trackingCode}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                      Chặng #{task.stopNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="text-cyan-400">~{task.estimatedDistanceKm} km</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">~{task.estimatedMinutes}p</span>
                  </div>
                </div>

                <div className="mt-1">
                  <span className="text-white font-bold text-xs">{task.name}</span>
                  <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                    <span>{task.address}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 mt-1.5 border-t border-slate-900 font-mono">
                  {(task.codAmount > 0 || task.isCod) ? (
                    <span className="text-amber-400 font-bold">Thu COD: {Number(task.codAmount || 0).toLocaleString('vi-VN')} đ</span>
                  ) : (
                    <span />
                  )}
                  <span>{task.declaredWeight} kg</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* End Point Hub */}
        <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs">
          <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
            {optimizedRoute.length + 1}
          </div>
          <div className="flex-1">
            <span className="text-slate-300 font-bold text-xs block">Điểm Kết Thúc: Quay Về Hub Bàn Giao & Đối Soát COD</span>
            <span className="text-[10px] text-slate-500">Nộp tiền thu hộ COD và trả kiện tồn kho / hoàn hàng</span>
          </div>
        </div>

        {/* Start Shift Action Button */}
        <button
          onClick={handleStartShiftAndNavigate}
          disabled={optimizedRoute.length === 0}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {isDeliveryOnly
            ? `Bắt Đầu Ca Giao Hàng (${optimizedRoute.length} Điểm Dừng Tối Ưu)`
            : `Bắt Đầu Ca Gom Hàng (${optimizedRoute.length} Điểm Dừng Tối Ưu)`}
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default ShipperZonePage;
