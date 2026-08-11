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
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> UC Manage Users & Security Lockout
          </div>
          <h3 className="text-2xl font-black text-white">Quản Lý Tài Khoản & Chống Khóa Tự Động Admin</h3>
          <p className="text-xs text-slate-400">Kiểm tra tài khoản bị tạm khóa do nhập sai mật khẩu 5 lần & mở khóa quy trình xác minh</p>
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
              className="glass-input rounded-xl pl-9 pr-3 py-1.5 text-xs w-56"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-1.5 text-xs"
          >
            <option value="ALL" className="bg-slate-900">Tất Cả Vai Trò</option>
            <option value="ADMIN" className="bg-slate-900">ADMIN</option>
            <option value="STAFF" className="bg-slate-900">STAFF</option>
            <option value="SELLER" className="bg-slate-900">SELLER</option>
            <option value="DRIVER" className="bg-slate-900">DRIVER</option>
          </select>
        </div>
      </div>

      {/* Security Lockout Notice Banner */}
      <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/50 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-bold text-white">Quy tắc Bảo mật Đăng nhập (Auth Controller Security):</p>
          <p>• Khi người dùng nhập sai mật khẩu quá 5 lần liên tiếp, hệ thống sẽ tự động khóa tài khoản (`isActive = false`).</p>
          <p>• Tài khoản có vai trò <span className="font-mono text-purple-300 font-bold">ADMIN</span> sẽ bị hệ thống **chặn tự khóa (Self-Lock Prevention)** để đảm bảo luôn có quyền quản trị.</p>
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase">
                <th className="py-3.5 px-4">Tài Khoản Người Dùng</th>
                <th className="py-3.5 px-4">Vai Trò / Role</th>
                <th className="py-3.5 px-4">Lần Sai Mật Khẩu</th>
                <th className="py-3.5 px-4">Đăng Nhập Cuối</th>
                <th className="py-3.5 px-4">Trạng Thái Khoá</th>
                <th className="py-3.5 px-4 text-right">Thao Tác Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white">{u.fullName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email} • {u.phoneNumber}</div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-purple-300">
                    <span className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20">
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    {u.failedLoginAttempts > 0 ? (
                      <span className="text-amber-400 font-bold">{u.failedLoginAttempts}/5 lần</span>
                    ) : (
                      <span className="text-slate-500">0/5 lần</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {u.lastLogin || 'Chưa ghi nhận'}
                  </td>

                  <td className="py-3.5 px-4">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Unlock className="w-3 h-3" /> Hoạt Động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <Lock className="w-3 h-3" /> 🔒 Đã Khóa
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {u.role === 'ADMIN' ? (
                      <span className="text-[10px] text-slate-500 italic">Chặn Tự Khóa Admin</span>
                    ) : u.isActive ? (
                      <button
                        onClick={() => {
                          if (onToggleUserStatus) {
                            onToggleUserStatus(u.id, 'lock');
                          } else if (onToggleLock) {
                            onToggleLock(u.id);
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
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
                        className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
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
