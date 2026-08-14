import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useNavigate } from 'react-router';
import { adminAuthApi } from '../../api/auth.api';
import { UserRole, type AdminUser } from '../../types';

export const AdminLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const redirectByRole = (role: string) => {
    if (role === UserRole.DRIVER || role === UserRole.LINE_HAUL_DRIVER) {
      navigate('/driver/pickup');
    } else if (role === UserRole.WAREHOUSE_STAFF || role === UserRole.HUB_STAFF) {
      navigate('/warehouse/inbound');
    } else {
      navigate('/admin/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Vui lòng nhập Email/Số điện thoại và Mật khẩu');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await adminAuthApi.login({ identifier, password });
      const userProfile: AdminUser = res.user || {
        id: res._id || res.id || `USR-${Date.now()}`,
        fullName: res.fullName || 'Người dùng hệ thống',
        email: res.email || identifier,
        role: res.role,
        department: res.department || 'Bộ phận vận hành',
      };

      login(userProfile, res.accessToken);
      redirectByRole((res.role || '').toString());
    } catch (err: any) {
      const apiMsg =
        err.response?.data?.message ||
        err.message ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin xác thực.';
      setError(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-cyan-500/30 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Cổng Đăng Nhập E-Logistic</h2>
          <p className="text-xs text-slate-400">Đăng nhập bằng tài khoản được cấp bởi Quản trị viên</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                ⚠️ Xác Thực Thất Bại
              </div>
              <p className="text-[11px] text-rose-300/90">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email hoặc Số Điện Thoại</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập email hoặc sđt tài khoản..."
                className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Mật Khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl shimmer-btn text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Xác Thực & Đăng Nhập'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};


