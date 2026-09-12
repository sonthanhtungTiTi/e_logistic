import React, { useState, useEffect } from 'react';
import { MapPin, Compass, RefreshCw, Send, ShieldCheck, CheckSquare, Square, Layers } from 'lucide-react';
import { useNavigate } from 'react-router';
import { axiosClient } from '@/api/axiosClient';

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

export const ShipperZonePage: React.FC = () => {
  const navigate = useNavigate();
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('Hà Nội');
  const [allProvinces, setAllProvinces] = useState<string[]>(['Hà Nội', 'TP. Hồ Chí Minh', 'Cần Thơ', 'Đà Nẵng', 'Hải Phòng']);
  const [selectedZones, setSelectedZones] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shipper_selected_zones');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isWorking, setIsWorking] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [shipperArea, setShipperArea] = useState<any>(null);
  const [shipperProfile, setShipperProfile] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadShipperProfileAndZones();
  }, []);

  const loadShipperProfileAndZones = async () => {
    setLoading(true);
    try {
      // 1. Load Profile
      const profRes = await axiosClient.get('/auth/shipper/profile');
      if (profRes.data?.data) {
        const u = profRes.data.data;
        setShipperProfile(u);
        setIsWorking(u.isWorking !== false);
        setShipperArea(u.operatingArea || null);
        const prov = u.operatingArea?.province || 'Hà Nội';
        setSelectedProvince(prov);
        loadZones(prov);
      } else {
        loadZones('Hà Nội');
      }
    } catch (err) {
      console.warn('Lỗi tải thông tin khu vực:', err);
      loadZones('Hà Nội');
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
      console.warn('Lỗi tải danh mục zone:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWorking = async () => {
    const nextState = !isWorking;
    setIsWorking(nextState);
    try {
      await axiosClient.put('/auth/shipper/basic-info', { isWorking: nextState });
      setMsg(nextState ? '✅ Đã BẬT ca trực nhận đơn!' : '⏸️ Đã TẮT ca trực.');
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      console.warn('Lỗi cập nhật trạng thái làm việc');
    }
  };

  const handleToggleZone = (zoneId: string) => {
    setSelectedZones((prev) => {
      if (prev.includes(zoneId)) {
        if (prev.length <= 1) {
          setMsg('⚠️ Bạn cần chọn ít nhất 1 cụm tuyến để gom đơn!');
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

  const totalWaitingOrders = zones
    .filter((z) => selectedZones.includes(z.id))
    .reduce((sum, z) => sum + (z.activeOrders || 0), 0);

  return (
    <div className="space-y-4">
      {/* Shift Status Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">Trạng Thái Làm Việc</span>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              {isWorking ? 'Đang Sẵn Sàng Nhận Đơn' : 'Đang Tắt Ca Làm Việc'}
            </h2>
          </div>

          <button
            onClick={handleToggleWorking}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isWorking
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isWorking ? 'Bật Ca' : 'Tắt Ca'}
          </button>
        </div>

        {/* Quota Overview */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-400 block">Hạn Mức Lấy Hàng</span>
            <span className="text-xs sm:text-sm font-black text-blue-400">
              {shipperProfile?.pickupQuota?.current || 0} / {shipperProfile?.pickupQuota?.max || 25} đơn
            </span>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-400 block">Hạn Mức Giao Hàng</span>
            <span className="text-xs sm:text-sm font-black text-sky-400">
              {shipperProfile?.deliveryQuota?.current || 0} / {shipperProfile?.deliveryQuota?.max || 35} đơn
            </span>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-400 block">Tải Trọng Cho Phép</span>
            <span className="text-xs sm:text-sm font-black text-amber-400">
              {shipperProfile?.currentWeightKg || 0} / {shipperProfile?.maxWeightCapacityKg || 45} kg
            </span>
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
          {msg}
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
          📍{' '}
          <strong>
            {shipperArea?.subZone || 'Khu phố phụ trách'}, {shipperArea?.ward || ''}, {shipperArea?.district || ''},{' '}
            {shipperArea?.province || 'Hà Nội'}
          </strong>
        </div>
      </div>

      {/* Geozone Multi-Selection List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            Cụm Tuyến Nhận Gom Đơn (Chọn nhiều cụm khi ít đơn):
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
              <strong className="text-emerald-400 font-black">~{totalWaitingOrders}</strong> đơn chờ gom
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
          <div className="space-y-2.5">
            {zones.map((z) => {
              const isSelected = selectedZones.includes(z.id);
              return (
                <div
                  key={z.id}
                  onClick={() => handleToggleZone(z.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/70 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-500/10'
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
                        {z.code} ({z.hubCode})
                      </span>
                    </div>
                    <span className={`text-[11px] font-bold ${z.activeOrders > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      ~{z.activeOrders} đơn chờ
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-xs mt-2">{z.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {z.ward}, {z.district}, {z.province}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {z.subZones.map((sz, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800 font-medium"
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

        <button
          onClick={() => {
            localStorage.setItem('shipper_selected_zones', JSON.stringify(selectedZones));
            navigate(`/shipper/pickup?zones=${selectedZones.join(',')}`);
          }}
          disabled={selectedZones.length === 0}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition mt-3 cursor-pointer flex items-center justify-center gap-2"
        >
          <Layers className="w-4 h-4" />
          Bắt Đầu Nhận Đơn Lấy Hàng ({selectedZones.length} Cụm Tuyến)
        </button>
      </div>
    </div>
  );
};

export default ShipperZonePage;
