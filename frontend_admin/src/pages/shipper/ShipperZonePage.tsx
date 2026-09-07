import React, { useState, useEffect } from 'react';
import { MapPin, Compass, RefreshCw, Send, ShieldCheck } from 'lucide-react';
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
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [isWorking, setIsWorking] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [shipperArea, setShipperArea] = useState<any>(null);
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
        setZones(res.data.data);
        if (res.data.allProvinces) setAllProvinces(res.data.allProvinces);
        if (res.data.data.length > 0 && !selectedZone) {
          setSelectedZone(res.data.data[0].id);
        }
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
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-center">
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-400 block">Hạn Mức Lấy Hàng</span>
            <span className="text-sm font-black text-amber-400">0 / 25 đơn</span>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] text-slate-400 block">Hạn Mức Giao Hàng</span>
            <span className="text-sm font-black text-cyan-400">0 / 35 đơn</span>
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
          {msg}
        </div>
      )}

      {/* Official Assigned Area Banner */}
      <div className="bg-cyan-950/40 border border-cyan-500/30 p-3.5 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Địa Bàn Hoạt Động Được Cấp Phép</span>
          </div>
          <button
            onClick={() => navigate('/shipper/profile')}
            className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
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

      {/* Geozone Selection List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            Các Cụm Tuyến Thuộc Địa Bàn:
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

        {loading ? (
          <div className="p-6 text-center text-slate-500 text-xs space-y-1">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400" />
            <p>Đang tải danh mục cụm tuyến...</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {zones.map((z) => (
              <div
                key={z.id}
                onClick={() => setSelectedZone(z.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                  selectedZone === z.id
                    ? 'bg-slate-900 border-cyan-500/60 ring-1 ring-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                    {z.code} ({z.hubCode})
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold">~{z.activeOrders} đơn chờ</span>
                </div>

                <h3 className="font-bold text-white text-xs mt-1.5">{z.name}</h3>
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
            ))}
          </div>
        )}

        <button
          onClick={() => {
            navigate('/shipper/pickup');
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition mt-3 cursor-pointer"
        >
          Bắt Đầu Nhận Đơn Lấy Hàng Tại Khu Vực Này
        </button>
      </div>
    </div>
  );
};

export default ShipperZonePage;
