import React, { useState, useEffect } from 'react';
import { UserSecurityControl } from '../../components/admin/UserSecurityControl';
import { userAdminApi } from '../../api/user.api';
import type { UserAccount } from '../../types';
import { RefreshCw, UserPlus, X } from 'lucide-react';

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
    role: 'DRIVER',
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
      const res = await userAdminApi.createUser(formData);
      setCreateMsg(res.message || 'Tạo tài khoản thành công!');
      setFormData({ fullName: '', email: '', phoneNumber: '', role: 'DRIVER' });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Quản Lý Người Dùng & Phân Quyền</h2>
          <p className="text-xs text-slate-400">Dữ liệu đồng bộ trực tiếp từ Database MongoDB Backend API</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-3 py-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải Lại
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl shimmer-btn text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> Tạo Tài Khoản Mới
          </button>
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
        <UserSecurityControl
          users={users}
          onToggleUserStatus={handleToggleStatus}
        />
      )}

      {/* Modal Tạo Tài Khoản */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" /> Tạo Tài Khoản Nội Bộ Mới
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createMsg && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                {createMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lê Văn Nam"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="user@elogistic.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  required
                  placeholder="0912345678"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Vai Trò Hệ Thống (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                >
                  <option value="DRIVER" className="bg-slate-900">DRIVER (Tài Xế)</option>
                  <option value="HUB_STAFF" className="bg-slate-900">HUB_STAFF (Nhân Viên Kho)</option>
                  <option value="HUB_COORDINATOR" className="bg-slate-900">HUB_COORDINATOR (Điều Phối)</option>
                  <option value="ADMIN" className="bg-slate-900">ADMIN (Quản Trị Viên)</option>
                  <option value="SELLER" className="bg-slate-900">SELLER (Chủ Hàng)</option>
                </select>
              </div>

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
                  className="px-4 py-2 rounded-xl shimmer-btn text-white text-xs font-bold shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                >
                  {createLoading ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

