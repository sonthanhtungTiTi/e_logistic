import React, { useState, useEffect } from 'react';
import { UserSecurityControl } from '../../components/admin/UserSecurityControl';
import { userAdminApi } from '../../api/user.api';
import type { UserAccount } from '../../types';
import { RefreshCw, UserPlus, X, Truck, Navigation, Shield, Building2 } from 'lucide-react';

const VIETNAM_ADMIN_UNITS: Record<string, Record<string, string[]>> = {
  'Hà Nội': {
    'Quận Hoàn Kiếm': ['Phường Hàng Bài', 'Phường Tràng Tiền', 'Phường Lý Thái Tổ', 'Phường Hàng Bạc'],
    'Quận Ba Đình': ['Phường Điện Biên', 'Phường Đội Cấn', 'Phường Giảng Võ', 'Phường Kim Mã'],
    'Quận Cầu Giấy': ['Phường Dịch Vọng', 'Phường Yên Hòa', 'Phường Trung Hòa', 'Phường Nghĩa Tân'],
    'Quận Thanh Xuân': ['Phường Thanh Xuân Trung', 'Phường Nhân Chính', 'Phường Khương Mai'],
    'Quận Đống Đa': ['Phường Láng Hạ', 'Phường Ô Chợ Dừa', 'Phường Văn Miếu'],
  },
  'TP. Hồ Chí Minh': {
    'Quận Tân Bình': ['Phường 1', 'Phường 2', 'Phường 4', 'Phường 12', 'Phường 13'],
    'Quận 1': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Tân Định', 'Phường Cầu Ông Lãnh'],
    'Quận 3': ['Phường Võ Thị Sáu', 'Phường 1', 'Phường 2', 'Phường 5'],
    'Quận 7': ['Phường Tân Phong', 'Phường Tân Phú', 'Phường Tân Quy'],
    'TP Thủ Đức': ['Phường Thảo Điền', 'Phường An Phú', 'Phường Linh Trung', 'Phường Hiệp Phú'],
  },
  'Cần Thơ': {
    'Quận Ninh Kiều': ['Phường Tân An', 'Phường An Cư', 'Phường Xuân Khánh', 'Phường An Khánh'],
    'Quận Cái Răng': ['Phường Lê Bình', 'Phường Hưng Phú', 'Phường Hưng Thạnh'],
    'Quận Bình Thủy': ['Phường Bình Thủy', 'Phường An Thới', 'Phường Trà Nóc'],
  },
  'Đà Nẵng': {
    'Quận Hải Châu': ['Phường Hải Châu 1', 'Phường Thạch Thang', 'Phường Thanh Bình'],
    'Quận Thanh Khê': ['Phường Vĩnh Trung', 'Phường Tân Chính', 'Phường Tam Thuận'],
    'Quận Sơn Trà': ['Phường An Hải Bắc', 'Phường Phước Mỹ'],
  },
  'Hải Phòng': {
    'Quận Hồng Bàng': ['Phường Hoàng Văn Thụ', 'Phường Minh Khai', 'Phường Phan Bội Châu'],
    'Quận Ngô Quyền': ['Phường Máy Chai', 'Phường Cầu Đất', 'Phường Lạc Viên'],
    'Quận Lê Chân': ['Phường An Biên', 'Phường Cát Dài'],
  },
  'Bình Dương': {
    'TP Thủ Dầu Một': ['Phường Phú Cường', 'Phường Hiệp Thành', 'Phường Chánh Nghĩa'],
    'TP Thuận An': ['Phường Lái Thiêu', 'Phường An Phú'],
  },
  'Đồng Nai': {
    'TP Biên Hòa': ['Phường Quyết Thắng', 'Phường Trung Dũng', 'Phường Tân Phong'],
  },
};

const HUBS_LIST = [
  { code: 'HUB_HAN_01', name: 'Bưu cục Trung tâm Hà Nội (Miền Bắc)' },
  { code: 'HUB_SGN_01', name: 'Bưu cục Trung tâm TP.HCM (Miền Nam)' },
  { code: 'HUB_VCA_01', name: 'Bưu cục Cần Thơ (Miền Tây)' },
  { code: 'HUB_DAD_01', name: 'Bưu cục Đà Nẵng (Miền Trung)' },
  { code: 'HUB_HPH_01', name: 'Bưu cục Hải Phòng (Duyên Hải)' },
  { code: 'HUB_BDG_01', name: 'Bưu cục Bình Dương' },
  { code: 'HUB_DNI_01', name: 'Bưu cục Đồng Nai' },
];

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createMsg, setCreateMsg] = useState<string>('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    role: 'SHIPPER',
    hubId: 'HUB_SGN_01',
    // Vehicle
    licensePlate: '',
    vehicleType: '',
    // Operating Area for Shipper
    province: 'TP. Hồ Chí Minh',
    district: 'Quận Tân Bình',
    ward: 'Phường 12',
    subZone: 'Khu phố 5',
  });

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await userAdminApi.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Không thể tải danh sách tài khoản từ Backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (userId: string, action: 'lock' | 'unlock') => {
    try {
      await userAdminApi.toggleUserStatus(userId, action);
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Thao tác cập nhật trạng thái thất bại');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateMsg('');
    try {
      const payload: any = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        hubId: formData.hubId,
      };

      if (formData.role === 'SHIPPER') {
        payload.vehicleInfo = {
          licensePlate: formData.licensePlate || '59C2-999.88',
          vehicleType: formData.vehicleType || 'Xe máy giao nhận',
        };
        payload.operatingArea = {
          province: formData.province,
          district: formData.district,
          ward: formData.ward,
          subZone: formData.subZone || 'Khu phố 1',
          detailAddress: `${formData.subZone || 'Khu phố 1'}, ${formData.ward}, ${formData.district}, ${formData.province}`,
        };
      } else if (formData.role === 'DRIVER') {
        payload.vehicleInfo = {
          licensePlate: formData.licensePlate || '51C-999.99',
          vehicleType: formData.vehicleType || 'Xe tải 8 tấn (Tuyến liên tỉnh)',
        };
      }

      const res = await userAdminApi.createUser(payload);
      setCreateMsg(res.message || 'Tạo tài khoản thành công!');
      setFormData({
        fullName: '',
        email: '',
        phoneNumber: '',
        role: 'SHIPPER',
        hubId: 'HUB_SGN_01',
        licensePlate: '',
        vehicleType: '',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận Tân Bình',
        ward: 'Phường 12',
        subZone: 'Khu phố 5',
      });
      await loadUsers();
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateMsg('');
      }, 1500);
    } catch (err: any) {
      setCreateMsg(err.response?.data?.message || err.message || 'Tạo tài khoản thất bại.');
    } finally {
      setCreateLoading(false);
    }
  };

  const totalUserCount = users.length;
  const shipperCount = users.filter(u => u.role === 'SHIPPER' || u.role === 'LOCAL_SHIPPER').length;
  const driverCount = users.filter(u => u.role === 'LINE_HAUL_DRIVER' || u.role === 'DRIVER').length;
  const lockedCount = users.filter(u => u.isLocked || u.status === 'LOCKED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* TẦNG 1: Page Header & KPI Summary Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Quản Lý Người Dùng &amp; Khóa</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Phân quyền tài khoản hệ thống, tạo tài khoản vận hành &amp; kiểm soát trạng thái khóa 2 lớp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Tạo Tài Khoản Mới
            </button>
            <button
              onClick={loadUsers}
              disabled={loading}
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
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Tài Khoản</span>
              <span className="text-2xl font-black text-white mt-1 block font-mono">{totalUserCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Shipper Nội Thành</span>
              <span className="text-2xl font-black text-cyan-400 mt-1 block font-mono">{shipperCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Navigation className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tài Xế Line-Haul</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">{driverCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tài Khoản Bị Khóa</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block font-mono">{lockedCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center space-y-3 glass-panel rounded-2xl border border-slate-800">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Đang đồng bộ dữ liệu người dùng từ API Backend...</p>
        </div>
      ) : (
        <UserSecurityControl users={users} onToggleUserStatus={handleToggleStatus} />
      )}

      {/* Modal Tạo Tài Khoản */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" /> Tạo Tài Khoản Người Dùng Mới
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createMsg && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                {createMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Họ và Tên <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Số Điện Thoại <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0912345678"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Email Đăng Nhập <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@elogistic.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Role Selection with Clear Visual Labels */}
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" /> Vai Trò Hệ Thống (Role) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs bg-slate-900 border border-slate-700 text-white font-bold"
                >
                  <option value="SHIPPER" className="bg-slate-900 text-cyan-300">
                    🚚 SHIPPER (Tài Xế Giao Nhận Nội Thành - Lấy &amp; Giao Đơn)
                  </option>
                  <option value="DRIVER" className="bg-slate-900 text-indigo-300">
                    🚛 DRIVER (Tài Xế Xe Tải Liên Tỉnh - Trung Chuyển Tuyến Đường Trục)
                  </option>
                  <option value="HUB_STAFF" className="bg-slate-900 text-sky-300">
                    🏢 HUB_STAFF (Nhân Viên Kho Vận)
                  </option>
                  <option value="HUB_COORDINATOR" className="bg-slate-900 text-blue-300">
                    📋 HUB_COORDINATOR (Điều Phối Viên Bưu Cục)
                  </option>
                  <option value="ADMIN" className="bg-slate-900 text-purple-300">
                    🛡️ ADMIN (Quản Trị Viên)
                  </option>
                  <option value="SELLER" className="bg-slate-900 text-emerald-300">
                    📦 SELLER (Chủ Hàng / Đối Tác)
                  </option>
                </select>
              </div>

              {/* Hub Assignment */}
              {(formData.role === 'SHIPPER' || formData.role === 'DRIVER' || formData.role === 'HUB_STAFF' || formData.role === 'HUB_COORDINATOR') && (
                <div>
                  <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" /> Bưu Cục / Hub Trực Thuộc
                  </label>
                  <select
                    value={formData.hubId}
                    onChange={(e) => setFormData({ ...formData, hubId: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs bg-slate-900"
                  >
                    {HUBS_LIST.map((h) => (
                      <option key={h.code} value={h.code} className="bg-slate-900">
                        {h.name} ({h.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Specific Config for Local SHIPPER */}
              {formData.role === 'SHIPPER' && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 space-y-3">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
                    <Navigation className="w-3.5 h-3.5" /> Phân Vùng Địa Bàn Phụ Trách (Cấp phép cho Shipper)
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Tỉnh / Thành phố</label>
                      <select
                        value={formData.province}
                        onChange={(e) => {
                          const p = e.target.value;
                          const firstDist = Object.keys(VIETNAM_ADMIN_UNITS[p] || {})[0] || '';
                          const firstWard = (VIETNAM_ADMIN_UNITS[p]?.[firstDist] || [])[0] || '';
                          setFormData({
                            ...formData,
                            province: p,
                            district: firstDist,
                            ward: firstWard,
                          });
                        }}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs bg-slate-900"
                      >
                        {Object.keys(VIETNAM_ADMIN_UNITS).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Quận / Huyện</label>
                      <select
                        value={formData.district}
                        onChange={(e) => {
                          const d = e.target.value;
                          const firstWard = (VIETNAM_ADMIN_UNITS[formData.province]?.[d] || [])[0] || '';
                          setFormData({ ...formData, district: d, ward: firstWard });
                        }}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs bg-slate-900"
                      >
                        {Object.keys(VIETNAM_ADMIN_UNITS[formData.province] || {}).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Phường / Xã</label>
                      <select
                        value={formData.ward}
                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs bg-slate-900"
                      >
                        {(VIETNAM_ADMIN_UNITS[formData.province]?.[formData.district] || []).map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Cụm tuyến / Khu phố</label>
                      <input
                        type="text"
                        placeholder="VD: Khu phố 5"
                        value={formData.subZone}
                        onChange={(e) => setFormData({ ...formData, subZone: e.target.value })}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Biển số xe máy</label>
                      <input
                        type="text"
                        placeholder="VD: 59C2-123.45"
                        value={formData.licensePlate}
                        onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Loại phương tiện</label>
                      <input
                        type="text"
                        placeholder="VD: Xe máy Honda Wave"
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Specific Config for Long-haul DRIVER */}
              {formData.role === 'DRIVER' && (
                <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 space-y-3">
                  <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                    <Truck className="w-3.5 h-3.5" /> Thông Tin Phương Tiện Xe Tải Đường Trục (Line-haul)
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Biển số xe tải</label>
                      <input
                        type="text"
                        placeholder="VD: 51C-889.99"
                        value={formData.licensePlate}
                        onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Loại xe tải / Trọng tải</label>
                      <input
                        type="text"
                        placeholder="VD: Xe tải 8 tấn (Thùng kín)"
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 rounded-xl shimmer-btn text-white text-xs font-bold shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                >
                  {createLoading ? 'Đang tạo...' : 'Tạo Tài Khoản Người Dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

