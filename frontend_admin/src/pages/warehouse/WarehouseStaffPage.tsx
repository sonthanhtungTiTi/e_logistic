import React, { useState, useEffect, useCallback } from 'react';
import { warehouseLookupApi } from '@/api/warehouseLookup.api';
import { toast } from 'sonner';
import {
  Users,
  Search,
  RefreshCw,
  X,
  Phone,
  Mail,
  Building2,
  ArrowLeftRight,
} from 'lucide-react';

export const WarehouseStaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Role switch modal state
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [targetRole, setTargetRole] = useState<'INBOUND_STAFF' | 'OUTBOUND_STAFF' | 'WAREHOUSE_STAFF'>('INBOUND_STAFF');
  const [savingRole, setSavingRole] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehouseLookupApi.getStaff({
        q: searchTerm.trim() || undefined,
        role: roleFilter,
      });
      setStaffList(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tải danh sách nhân viên kho');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleUpdateRole = async () => {
    if (!selectedStaff) return;
    setSavingRole(true);
    try {
      await warehouseLookupApi.updateStaffRole(selectedStaff._id, targetRole);
      toast.success(`Đã chuyển đổi vai trò nhân viên [${selectedStaff.fullName}] sang [${targetRole}] thành công!`);
      setSelectedStaff(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi điều chuyển vai trò nhân viên');
    } finally {
      setSavingRole(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'INBOUND_STAFF':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
            📥 Nhân Viên Nhập Kho
          </span>
        );
      case 'OUTBOUND_STAFF':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 w-fit">
            📤 Nhân Viên Xuất Kho
          </span>
        );
      case 'WAREHOUSE_MANAGER':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 w-fit">
            🏢 Quản Lý Kho Vận
          </span>
        );
      case 'HUB_COORDINATOR':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 w-fit">
            🧭 Điều Phối Hub
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 w-fit">
            📦 {role}
          </span>
        );
    }
  };

  // Stats calculation
  const totalStaff = staffList.length;
  const inboundCount = staffList.filter((s) => s.role === 'INBOUND_STAFF').length;
  const outboundCount = staffList.filter((s) => s.role === 'OUTBOUND_STAFF').length;
  const activeCount = staffList.filter((s) => s.isWorking).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-500" />
            Quản Lý Nhân Viên Kho Vận (Hub Staff Management)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Xem danh sách nhân sự tại Hub, phân định chuyên môn Nhân Viên Nhập Kho vs Nhân Viên Xuất Kho và điều chuyển ca trực
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStaff}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            Làm mới danh sách
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 uppercase font-bold">TỔNG NHÂN VIÊN HUB</span>
          <p className="text-2xl font-black text-white font-mono mt-1">{totalStaff}</p>
        </div>
        <div className="bg-slate-900 border border-emerald-500/20 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-emerald-400 uppercase font-bold">NV NHẬP KHO (INBOUND)</span>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{inboundCount}</p>
        </div>
        <div className="bg-slate-900 border border-blue-500/20 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-blue-400 uppercase font-bold">NV XUẤT KHO (OUTBOUND)</span>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">{outboundCount}</p>
        </div>
        <div className="bg-slate-900 border border-amber-500/20 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-amber-400 uppercase font-bold">ĐANG LÀM VIỆC (ONLINE)</span>
          <p className="text-2xl font-black text-amber-400 font-mono mt-1">{activeCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, email, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400">Lọc theo vai trò:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="ALL">Tất cả nhân sự</option>
            <option value="INBOUND_STAFF">📥 Nhân viên Nhập kho (INBOUND_STAFF)</option>
            <option value="OUTBOUND_STAFF">📤 Nhân viên Xuất kho (OUTBOUND_STAFF)</option>
            <option value="WAREHOUSE_MANAGER">🏢 Quản lý kho (WAREHOUSE_MANAGER)</option>
            <option value="HUB_COORDINATOR">🧭 Điều phối Hub (HUB_COORDINATOR)</option>
          </select>
        </div>
      </div>

      {/* STAFF TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nhân Viên / Thông Tin</th>
                <th className="py-3.5 px-4">Số Điện Thoại</th>
                <th className="py-3.5 px-4">Vai Trò Chuyên Môn</th>
                <th className="py-3.5 px-4">Trạng Thái Ca</th>
                <th className="py-3.5 px-4">Bưu Cục Trực Thuộc</th>
                <th className="py-3.5 px-4">Ngày Tạo</th>
                <th className="py-3.5 px-4 text-center">Điều Chuyển Vai Trò</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Đang tải danh sách nhân viên kho...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    Không tìm thấy nhân viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-300 text-xs shrink-0">
                          {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{staff.fullName}</p>
                          <p className="text-slate-400 text-[11px] font-mono flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {staff.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-400" />
                        <span>{staff.phoneNumber}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getRoleBadge(staff.role)}</td>
                    <td className="py-3.5 px-4">
                      {staff.isWorking ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Đang làm việc
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          <span className="w-2 h-2 rounded-full bg-slate-500" />
                          Ngoại tuyến
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>{staff.hubId?.name || 'Bưu cục trung tâm'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                      {new Date(staff.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {staff.role === 'WAREHOUSE_MANAGER' ? (
                        <span className="text-[11px] text-slate-500 italic">Quản lý</span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedStaff(staff);
                            setTargetRole(staff.role === 'INBOUND_STAFF' ? 'OUTBOUND_STAFF' : 'INBOUND_STAFF');
                          }}
                          className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                          Đổi Vai Trò
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ĐIỀU CHUYỂN VAI TRÒ NHÂN SỰ */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedStaff(null)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider">ĐIỀU CHUYỂN NHÂN SỰ KHO</span>
              <h2 className="text-base font-bold text-white mt-0.5">Thay Đổi Vai Trò Tác Nghiệp</h2>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <p className="text-slate-400">
                Nhân viên: <strong className="text-white">{selectedStaff.fullName}</strong>
              </p>
              <p className="text-slate-400">
                Vai trò hiện tại: {getRoleBadge(selectedStaff.role)}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-bold">Chọn vai trò mới:</label>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  targetRole === 'INBOUND_STAFF'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="targetRole"
                    value="INBOUND_STAFF"
                    checked={targetRole === 'INBOUND_STAFF'}
                    onChange={() => setTargetRole('INBOUND_STAFF')}
                    className="accent-emerald-500"
                  />
                  <div>
                    <p className="text-white font-bold">📥 Nhân Viên Nhập Kho (INBOUND_STAFF)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Chuyên quét nhận hàng từ Shipper, kiểm tra ngoại quan &amp; cân trọng lượng</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  targetRole === 'OUTBOUND_STAFF'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="targetRole"
                    value="OUTBOUND_STAFF"
                    checked={targetRole === 'OUTBOUND_STAFF'}
                    onChange={() => setTargetRole('OUTBOUND_STAFF')}
                    className="accent-blue-500"
                  />
                  <div>
                    <p className="text-white font-bold">📤 Nhân Viên Xuất Kho (OUTBOUND_STAFF)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Chuyên gom bao tải, niêm phong Seal và quét xuất bãi chuyến xe</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingRole}
                onClick={handleUpdateRole}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/25"
              >
                {savingRole ? 'Đang lưu...' : 'Xác Nhận Đổi Vai Trò'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseStaffPage;
