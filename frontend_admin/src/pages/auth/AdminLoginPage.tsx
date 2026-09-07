import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useNavigate } from 'react-router';
import { UserRole } from '../../types';

export const AdminLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginWithCredentials } = useAdminAuth();
  const navigate = useNavigate();

  const redirectByRole = (role: string) => {
    if (
      role === 'SHIPPER' ||
      role === 'LOCAL_SHIPPER' ||
      role === UserRole.SHIPPER ||
      role === UserRole.LOCAL_SHIPPER
    ) {
      navigate('/shipper/zone');
    } else if (
      role === 'LINE_HAUL_DRIVER' ||
      role === UserRole.LINE_HAUL_DRIVER ||
      role === 'DRIVER' ||
      role === UserRole.DRIVER
    ) {
      navigate('/linehaul/trips');
    } else if (role === 'ORDER_VENDOR_MANAGER' || role === UserRole.ORDER_VENDOR_MANAGER) {
      navigate('/admin/vendor-ops');
    } else if (role === 'LAST_MILE_DISPATCHER' || role === UserRole.LAST_MILE_DISPATCHER) {
      navigate('/admin/dispatch/local');
    } else if (role === 'LINE_HAUL_DISPATCHER' || role === UserRole.LINE_HAUL_DISPATCHER) {
      navigate('/admin/dispatch/linehaul');
    } else if (
      role === UserRole.WAREHOUSE_STAFF ||
      role === UserRole.HUB_STAFF ||
      role === UserRole.HUB_COORDINATOR ||
      role === 'HUB_STAFF' ||
      role === 'WAREHOUSE_STAFF' ||
      role === 'HUB_COORDINATOR'
    ) {
      navigate('/warehouse/inbound');
    } else {
      navigate('/admin/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Vui lòng nhập Email hoặc Số điện thoại');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập Mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const profile = await loginWithCredentials(identifier.trim(), password);
      redirectByRole((profile.role || '').toString());
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin xác thực.';
      setError(msg);
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
          <h2 className="text-2xl font-black text-white tracking-tight">Cổng Quản Trị Operations</h2>
          <p className="text-xs text-slate-400">Đăng nhập tài khoản nhân sự &amp; điều hành E-Logistic</p>
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

          {/* Email / số điện thoại */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email hoặc Số điện thoại</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="login-identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="shipper.demo@elogistic.vn"
                className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono"
                disabled={loading}
              />
            </div>
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input rounded-xl pl-10 pr-10 py-2.5 text-xs"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xác thực...
              </>
            ) : (
              <>
                Đăng Nhập
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Gợi ý tài khoản test 1-Click */}
        <div className="pt-2 border-t border-slate-800 space-y-1.5">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tài khoản test nhanh (1-Click Fill)</p>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {[
              { label: '🛵 Shipper Nội Thành', email: 'shipper.demo@elogistic.vn', pw: 'Password123@' },
              { label: '🛡️ QL 1 (Duyệt Đơn & NCC)', email: 'vendormgr.demo@elogistic.vn', pw: 'Password123@' },
              { label: '🧭 QL 2 (Điều Phối Shipper)', email: 'dispatcher.demo@elogistic.vn', pw: 'Password123@' },
              { label: '🚛 QL 3 (Xe Tải Tuyến)', email: 'linehaul.demo@elogistic.vn', pw: 'Password123@' },
              { label: '🚚 Tài Xế Tuyến Liên Tỉnh', email: 'driver.demo@elogistic.vn', pw: 'Password123@' },
              { label: '📦 Kho Vận', email: 'hub.demo@elogistic.vn', pw: 'Password123@' },
              { label: '👑 Admin Hệ Thống', email: 'admin.demo@elogistic.vn', pw: 'Password123@' },
            ].map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setIdentifier(acc.email);
                  setPassword(acc.pw);
                }}
                className="w-full text-left px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-[10px] font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center justify-between"
              >
                <div className="truncate">
                  <span className="text-cyan-400">{acc.email}</span>
                </div>
                <span className="shrink-0 text-slate-300 font-sans font-semibold text-[10px] ml-2">{acc.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
