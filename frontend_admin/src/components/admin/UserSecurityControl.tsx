import React, { useState } from 'react';
import { Lock, Unlock, Search, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { UserAccount } from '../../types';

interface UserSecurityControlProps {
  users: UserAccount[];
  onToggleUserStatus?: (userId: string, action: 'lock' | 'unlock') => void;
  onToggleLock?: (userId: string) => void;
  onCreateUser?: (newUser: Partial<UserAccount>) => void;
}

export const UserSecurityControl: React.FC<UserSecurityControlProps> = ({
  users,
  onToggleUserStatus,
  onToggleLock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phoneNumber.includes(searchTerm);
    
    if (!matchesSearch) return false;
    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'SHIPPER') return u.role === 'SHIPPER' || u.role === 'LOCAL_SHIPPER';
    if (roleFilter === 'DRIVER') return u.role === 'DRIVER' || u.role === 'LINE_HAUL_DRIVER';
    if (roleFilter === 'STAFF') {
      return (
        u.role === 'HUB_STAFF' ||
        u.role === 'HUB_COORDINATOR' ||
        u.role === 'WAREHOUSE_STAFF' ||
        u.role === 'STAFF' ||
        u.role === 'ORDER_VENDOR_MANAGER' ||
        u.role === 'LAST_MILE_DISPATCHER' ||
        u.role === 'LINE_HAUL_DISPATCHER'
      );
    }
    return u.role === roleFilter;
  });

  const renderRoleBadge = (u: UserAccount) => {
    if (u.role === 'SHIPPER' || u.role === 'LOCAL_SHIPPER') {
      return (
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
            🚚 SHIPPER (Nội Thành)
          </span>
          <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-mono">
            {u.operatingArea?.province ? (
              <span>
                📍 {u.operatingArea.province} {u.operatingArea.district ? `• ${u.operatingArea.district}` : ''}{' '}
                {u.operatingArea.subZone ? `(${u.operatingArea.subZone})` : ''}
              </span>
            ) : (
              <span className="text-slate-400 italic">Chưa gán địa bàn</span>
            )}
          </div>
        </div>
      );
    }

    if (u.role === 'DRIVER' || u.role === 'LINE_HAUL_DRIVER') {
      return (
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
            🚛 DRIVER (Xe Tải Liên Tỉnh)
          </span>
          <div className="text-[10px] text-indigo-600/80 dark:text-indigo-300/80 font-mono">
            {u.vehicleInfo?.licensePlate ? (
              <span>
                🏷️ {u.vehicleInfo.licensePlate} {u.vehicleInfo.vehicleType ? `• ${u.vehicleInfo.vehicleType}` : ''}
              </span>
            ) : (
              <span>🚚 Tuyến liên tỉnh ({u.hubId?.name || 'Hub trung tâm'})</span>
            )}
          </div>
        </div>
      );
    }

    if (u.role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
          🛡️ ADMIN (Quản Trị Viên)
        </span>
      );
    }

    if (u.role === 'SELLER') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
          📦 SELLER (Chủ Hàng)
        </span>
      );
    }

    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
          🏢 {u.role}
        </span>
        {u.hubId?.name && <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-mono">📍 {u.hubId.name}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-xs font-bold uppercase mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> UC Manage Users &amp; Security Lockout
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Quản Lý Tài Khoản &amp; Chống Khóa Tự Động Admin</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Kiểm tra tài khoản bị tạm khóa do nhập sai mật khẩu 5 lần &amp; mở khóa quy trình xác minh</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm tên, email, sđt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl pl-9 pr-3 py-1.5 text-xs w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">🌟 Tất Cả Vai Trò</option>
            <option value="SHIPPER">🚚 SHIPPER (Tài Xế Giao Nhận Nội Thành)</option>
            <option value="DRIVER">🚛 DRIVER (Tài Xế Xe Tải Liên Tỉnh)</option>
            <option value="ADMIN">🛡️ ADMIN (Quản Trị Viên)</option>
            <option value="STAFF">🏢 STAFF (Nhân Viên Kho &amp; Điều Phối)</option>
            <option value="SELLER">📦 SELLER (Chủ Hàng)</option>
          </select>
        </div>
      </div>

      {/* Security Lockout Notice Banner */}
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 dark:text-blue-200 space-y-1">
          <p className="font-bold text-blue-900 dark:text-white">Quy tắc Bảo mật Đăng nhập (Auth Controller Security):</p>
          <p>• Khi người dùng nhập sai mật khẩu quá 5 lần liên tiếp, hệ thống sẽ tự động khóa tài khoản (<code className="font-mono bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded text-blue-800 dark:text-blue-300">isActive = false</code>).</p>
          <p>• Tài khoản có vai trò <span className="font-mono text-blue-700 dark:text-blue-300 font-bold">ADMIN</span> sẽ bị hệ thống <strong>chặn tự khóa (Self-Lock Prevention)</strong> để đảm bảo luôn có quyền quản trị.</p>
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <th className="py-3.5 px-4">Tài Khoản Người Dùng</th>
                <th className="py-3.5 px-4">Vai Trò / Phân Loại Role</th>
                <th className="py-3.5 px-4">Lần Sai Mật Khẩu</th>
                <th className="py-3.5 px-4">Đăng Nhập Cuối</th>
                <th className="py-3.5 px-4">Trạng Thái Khoá</th>
                <th className="py-3.5 px-4 text-right">Thao Tác Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-xs">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{u.fullName}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{u.email} • {u.phoneNumber}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    {renderRoleBadge(u)}
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    {u.failedLoginAttempts > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{u.failedLoginAttempts}/5 lần</span>
                    ) : (
                      <span className="text-slate-400">0/5 lần</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                    {u.lastLogin || 'Chưa ghi nhận'}
                  </td>

                  <td className="py-3.5 px-4">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                        <Unlock className="w-3 h-3" /> Hoạt Động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                        <Lock className="w-3 h-3" /> 🔒 Đã Khóa
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {u.role === 'ADMIN' ? (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Chặn Tự Khóa Admin</span>
                    ) : u.isActive ? (
                      <button
                        onClick={() => {
                          if (onToggleUserStatus) {
                            onToggleUserStatus(u.id, 'lock');
                          } else if (onToggleLock) {
                            onToggleLock(u.id);
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-600 text-rose-700 dark:text-rose-300 hover:text-white border border-rose-200 dark:border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                      >
                        Khóa Tài Khoản
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (onToggleUserStatus) {
                            onToggleUserStatus(u.id, 'unlock');
                          } else if (onToggleLock) {
                            onToggleLock(u.id);
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                      >
                        Mở Khóa Tức Thì
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
