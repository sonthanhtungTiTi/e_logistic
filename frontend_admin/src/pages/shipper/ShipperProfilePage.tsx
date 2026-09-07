import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Truck,
  MapPin,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Save,
  Compass,
} from 'lucide-react';
import { axiosClient } from '@/api/axiosClient';

interface OperatingArea {
  province?: string;
  district?: string;
  ward?: string;
  subZone?: string;
  detailAddress?: string;
}

interface ZoneChangeRequest {
  requestedArea?: OperatingArea;
  reason?: string;
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt?: string;
  rejectionReason?: string;
  reviewedAt?: string;
}

interface ShipperProfile {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  vehicleInfo?: {
    licensePlate?: string;
    vehicleType?: string;
  };
  isWorking?: boolean;
  operatingArea?: OperatingArea;
  zoneChangeRequest?: ZoneChangeRequest;
}

export const ShipperProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ShipperProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingBasic, setSavingBasic] = useState<boolean>(false);
  const [submittingReq, setSubmittingReq] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state for basic info
  const [fullName, setFullName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('Xe máy');
  const [isWorking, setIsWorking] = useState<boolean>(true);

  // Form state for Zone Change Request
  const [reqProvince, setReqProvince] = useState<string>('Hà Nội');
  const [reqDistrict, setReqDistrict] = useState<string>('Quận Hoàn Kiếm');
  const [reqWard, setReqWard] = useState<string>('Phường Hàng Bài');
  const [reqSubZone, setReqSubZone] = useState<string>('Khu phố 1');
  const [reqReason, setReqReason] = useState<string>('');

  const provinceOptions: { [key: string]: { districts: { [key: string]: string[] } } } = {
    'Hà Nội': {
      districts: {
        'Quận Hoàn Kiếm': ['Phường Hàng Bài', 'Phường Tràng Tiền', 'Phường Cửa Nam'],
        'Quận Thanh Xuân': ['Phường Thanh Xuân Trung', 'Phường Nhân Chính', 'Phường Khương Đình'],
        'Quận Cầu Giấy': ['Phường Dịch Vọng', 'Phường Nghĩa Tân', 'Phường Mai Dịch'],
      },
    },
    'TP. Hồ Chí Minh': {
      districts: {
        'Quận Tân Bình': ['Phường 12', 'Phường 13', 'Phường 4'],
        'Quận 1': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Kho'],
        'Quận 5': ['Phường 1', 'Phường 2', 'Phường 5'],
      },
    },
    'Cần Thơ': {
      districts: {
        'Quận Ninh Kiều': ['Phường Tân An', 'Phường An Lạc', 'Phường An Hội'],
        'Quận Cái Răng': ['Phường Lê Bình', 'Phường Hưng Phú'],
      },
    },
    'Đà Nẵng': {
      districts: {
        'Quận Hải Châu': ['Phường Hải Châu 1', 'Phường Hải Châu 2', 'Phường Thạch Thang'],
      },
    },
    'Hải Phòng': {
      districts: {
        'Quận Hồng Bàng': ['Phường Hoàng Văn Thụ', 'Phường Minh Khai'],
      },
    },
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/auth/shipper/profile');
      if (res.data?.data) {
        const u = res.data.data;
        setProfile(u);
        setFullName(u.fullName || '');
        setPhoneNumber(u.phoneNumber || '');
        setLicensePlate(u.vehicleInfo?.licensePlate || '');
        setVehicleType(u.vehicleInfo?.vehicleType || 'Xe máy');
        setIsWorking(u.isWorking !== false);

        if (u.operatingArea?.province && provinceOptions[u.operatingArea.province]) {
          setReqProvince(u.operatingArea.province);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải hồ sơ Shipper:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBasic(true);
    try {
      await axiosClient.put('/auth/shipper/basic-info', {
        fullName,
        phoneNumber,
        vehicleInfo: {
          licensePlate,
          vehicleType,
        },
        isWorking,
      });
      setMsg({ type: 'success', text: '✅ Đã lưu thông tin cá nhân và phương tiện thành công!' });
      loadProfile();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi lưu thông tin cá nhân' });
    } finally {
      setSavingBasic(false);
    }
  };

  const handleSendZoneRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqReason.trim()) {
      alert('Vui lòng nhập lý do xin đổi khu vực');
      return;
    }

    setSubmittingReq(true);
    try {
      const detail = `${reqSubZone}, ${reqWard}, ${reqDistrict}, ${reqProvince}`;
      await axiosClient.post('/auth/shipper/request-zone-change', {
        requestedArea: {
          province: reqProvince,
          district: reqDistrict,
          ward: reqWard,
          subZone: reqSubZone,
          detailAddress: detail,
        },
        reason: reqReason.trim(),
      });
      setMsg({
        type: 'success',
        text: '📨 Yêu cầu chuyển khu vực đã được gửi thành công. Vui lòng chờ Admin phê duyệt!',
      });
      setReqReason('');
      loadProfile();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi gửi yêu cầu chuyển khu vực' });
    } finally {
      setSubmittingReq(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-2">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
        <p className="text-xs">Đang tải hồ sơ Shipper...</p>
      </div>
    );
  }

  const currentDistricts = provinceOptions[reqProvince]?.districts || {};
  const currentWards = currentDistricts[reqDistrict] || [];

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header Profile Summary */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-cyan-500/20">
            {profile?.fullName?.charAt(0) || 'S'}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-white">{profile?.fullName}</h2>
            <p className="text-xs text-slate-400 font-mono">{profile?.email}</p>
            <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              VAI TRÒ: {profile?.role}
            </span>
          </div>
          <div className="text-right">
            <button
              onClick={() => setIsWorking(!isWorking)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isWorking
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              {isWorking ? 'Đang Trực Ca' : 'Tắt Ca'}
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white px-1">
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: KHU VỰC HOẠT ĐỘNG CHÍNH THỨC */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <MapPin className="w-4 h-4" />
            <span>Khu Vực Phụ Trách Hiện Tại</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Đã Xác Thực
          </span>
        </div>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Tỉnh / Thành phố:</span>
            <strong className="text-white">{profile?.operatingArea?.province || 'Chưa thiết lập'}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Quận / Huyện:</span>
            <strong className="text-slate-200">{profile?.operatingArea?.district || 'Chưa thiết lập'}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Phường / Xã:</span>
            <strong className="text-slate-200">{profile?.operatingArea?.ward || 'Chưa thiết lập'}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Cụm tuyến / Khu phố:</span>
            <span className="font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
              {profile?.operatingArea?.subZone || 'Tất cả cụm tuyến'}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          🔒 <em>Khu vực này do Quản trị viên cấp phép để phân phối đơn hàng. Shipper không được tự ý sửa trực tiếp.</em>
        </p>
      </div>

      {/* SECTION 2: GỬI YÊU CẦU ĐỔI KHU VỰC */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <Send className="w-4 h-4" />
            <span>Xin Chuyển Khu Vực Hoạt Động Mới</span>
          </div>
          <span className="text-[10px] text-slate-400">Cần Admin Duyệt</span>
        </div>

        {/* Trạng thái yêu cầu gần nhất */}
        {profile?.zoneChangeRequest && profile.zoneChangeRequest.status !== 'NONE' && (
          <div
            className={`p-3 rounded-xl text-xs space-y-1 ${
              profile.zoneChangeRequest.status === 'PENDING'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                : profile.zoneChangeRequest.status === 'APPROVED'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <div className="flex items-center gap-1.5">
                {profile.zoneChangeRequest.status === 'PENDING' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                {profile.zoneChangeRequest.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {profile.zoneChangeRequest.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                <span>
                  Trạng thái:{' '}
                  {profile.zoneChangeRequest.status === 'PENDING'
                    ? 'ĐANG CHỜ ADMIN DUYỆT'
                    : profile.zoneChangeRequest.status === 'APPROVED'
                    ? 'ĐÃ ĐƯỢC PHÊ DUYỆT'
                    : 'BỊ TỪ CHỐI'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300">
              Khu vực mong muốn: {profile.zoneChangeRequest.requestedArea?.subZone},{' '}
              {profile.zoneChangeRequest.requestedArea?.ward}, {profile.zoneChangeRequest.requestedArea?.district},{' '}
              {profile.zoneChangeRequest.requestedArea?.province}
            </p>
            {profile.zoneChangeRequest.rejectionReason && (
              <p className="text-[11px] text-rose-300 font-semibold italic">
                Lý do từ chối: {profile.zoneChangeRequest.rejectionReason}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSendZoneRequest} className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Tỉnh / Thành Phố</label>
              <select
                value={reqProvince}
                onChange={(e) => {
                  const p = e.target.value;
                  setReqProvince(p);
                  const firstDist = Object.keys(provinceOptions[p]?.districts || {})[0] || '';
                  setReqDistrict(firstDist);
                  const firstWard = provinceOptions[p]?.districts[firstDist]?.[0] || '';
                  setReqWard(firstWard);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {Object.keys(provinceOptions).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Quận / Huyện</label>
              <select
                value={reqDistrict}
                onChange={(e) => {
                  const d = e.target.value;
                  setReqDistrict(d);
                  const firstWard = currentDistricts[d]?.[0] || '';
                  setReqWard(firstWard);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {Object.keys(currentDistricts).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Phường / Xã</label>
              <select
                value={reqWard}
                onChange={(e) => setReqWard(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {currentWards.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Cụm Tuyến / Khu Phố</label>
              <input
                type="text"
                value={reqSubZone}
                onChange={(e) => setReqSubZone(e.target.value)}
                placeholder="VD: Khu phố 5"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Lý Do Xin Chuyển Khu Vực <span className="text-amber-400">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
              placeholder="VD: Chuyển nơi cư trú gần khu vực Hoàn Kiếm, xin hỗ trợ tăng cường địa bàn..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={submittingReq || !reqReason.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {submittingReq ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Gửi Yêu Cầu Xin Đổi Khu Vực
          </button>
        </form>
      </div>

      {/* SECTION 3: THÔNG TIN CÁ NHÂN & PHƯƠNG TIỆN */}
      <form onSubmit={handleSaveBasic} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
            <User className="w-4 h-4 text-cyan-400" />
            <span>Thông Tin Cá Nhân & Phương Tiện</span>
          </div>
          <span className="text-[10px] text-slate-500">Tự chỉnh sửa</span>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Họ & Tên Shipper</label>
          <div className="relative">
            <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Số Điện Thoại</label>
          <div className="relative">
            <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Biển Số Xe</label>
            <div className="relative">
              <Truck className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="VD: 29A1-123.45"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Loại Phương Tiện</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Xe máy (Honda Wave)">Xe máy (Honda Wave)</option>
              <option value="Xe máy (Honda Air Blade)">Xe máy (Honda Air Blade)</option>
              <option value="Xe máy (Yamaha Sirius)">Xe máy (Yamaha Sirius)</option>
              <option value="Xe máy điện (VinFast Feliz)">Xe máy điện (VinFast Feliz)</option>
              <option value="Xe tải nhỏ 500kg">Xe tải nhỏ 500kg</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingBasic}
          className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
        >
          {savingBasic ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Lưu Thông Tin Cá Nhân
        </button>
      </form>
    </div>
  );
};

export default ShipperProfilePage;
