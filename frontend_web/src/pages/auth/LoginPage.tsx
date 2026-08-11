import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { KeyRound, Mail, Lock, Truck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('seller@anbinhpharm.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    // Simulate auth token
    login('mock-jwt-token-seller', {
      id: 'USR-SELLER-01',
      email,
      fullName: 'Công Ty Dược An Bình (Seller)',
      role: 'SELLER',
    });
    navigate('/seller/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
            <Truck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white">Đăng Nhập Seller Hub</h2>
          <p className="text-xs text-slate-400">Quản lý bưu gửi, theo dõi COD & tài chính đối tác</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email / Số Điện Thoại</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono"
                placeholder="seller@domain.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-300">Mật Khẩu</label>
              <Link to="/auth/forgot-password" className="text-[11px] text-blue-400 hover:underline">Quên mật khẩu?</Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl shimmer-btn text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            Đăng Nhập Kênh Seller
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          Chưa có tài khoản đối tác?{' '}
          <Link to="/auth/register" className="text-blue-400 font-bold hover:underline">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
};
