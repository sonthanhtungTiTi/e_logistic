import React, { useState } from 'react';
import { X, KeyRound, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { AdminRole } from '../types';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (role: AdminRole, email: string) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('admin@elogistic.vn');
  const [password, setPassword] = useState('admin123');
  const [role, setRole] = useState<AdminRole>('ADMIN');
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== 'admin123' && password !== '123456') {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);
      if (nextFail >= 5) {
        setErrorMsg('Bạn đã nhập sai mật khẩu 5 lần! Tài khoản của bạn bị tạm khóa 15 phút.');
      } else {
        setErrorMsg(`Mật khẩu không đúng. Còn ${5 - nextFail} lần thử trước khi khóa tự động.`);
      }
      return;
    }

    setErrorMsg('');
    onLoginSuccess(role, email);
    onClose();
  };

  const handleQuickFill = (fillRole: AdminRole, fillEmail: string) => {
    setRole(fillRole);
    setEmail(fillEmail);
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-purple-500/30 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Đăng Nhập Cổng Nội Bộ Admin</h3>
              <p className="text-[10px] text-slate-400">Dành riêng cho Nhân sự điều phối & Administrator</p>
            </div>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email Công Ty / Mã Nhân Viên</label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Mật Khẩu Mật Mã</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Phân Quyền Nội Bộ</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-purple-300"
            >
              <option value="ADMIN" className="bg-slate-900">Quản Trị Viên Master (ADMIN)</option>
              <option value="OPERATIONS" className="bg-slate-900">Trưởng Kho Điều Phối Hub (OPERATIONS)</option>
              <option value="DISPATCHER" className="bg-slate-900">Chuyên Viên Điều Xe (DISPATCHER)</option>
            </select>
          </div>

          {/* Quick Demo Autofill */}
          <div className="pt-2">
            <span className="text-[10px] text-slate-400 block mb-1.5 font-bold uppercase">Tài Khoản Mẫu Nhanh:</span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => handleQuickFill('ADMIN', 'admin@elogistic.vn')}
                className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 font-semibold text-center"
              >
                Admin Master
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('OPERATIONS', 'staff.hub@elogistic.vn')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 font-semibold text-center"
              >
                Điều Phối Viên
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl shimmer-btn text-white text-xs font-bold shadow-lg shadow-purple-600/30 cursor-pointer flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            Đăng Nhập Cổng Quản Trị
          </button>
        </form>

      </div>
    </div>
  );
};
