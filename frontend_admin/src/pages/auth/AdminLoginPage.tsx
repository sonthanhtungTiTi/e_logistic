import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useNavigate } from 'react-router';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@elogistic.vn');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Vui lòng nhập mật khẩu quản trị');
      return;
    }
    login('ADMIN');
    navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-cyan-500/30 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Cổng Quản Trị Operations</h2>
          <p className="text-xs text-slate-400">Đăng nhập tài khoản nhân sự & điều hành E-Logistic</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email Quản Trị</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            className="w-full py-3 rounded-xl shimmer-btn text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            Đăng Nhập Quản Trị
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
