import { useState } from 'react';
import { X, KeyRound, AlertTriangle } from 'lucide-react';
import type { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register' | 'forgot';
  onClose: () => void;
  onLoginSuccess: (userRole: UserRole, email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('admin@elogistic.vn');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginRole, setLoginRole] = useState<UserRole>('ADMIN');
  const [loginError, setLoginError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  // Forgot Password Flow State (3 Steps)
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'locked.user@gmail.com') {
      setLoginError('Tài khoản này đã bị khóa do nhập sai quá 5 lần. Vui lòng liên hệ Admin.');
      return;
    }

    if (loginPassword !== '123456' && loginPassword !== 'admin123') {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);
      if (nextFail >= 5) {
        setLoginError('Bạn đã nhập sai mật khẩu 5 lần! Chức năng tạm khóa trong 15 phút.');
      } else {
        setLoginError(`Mật khẩu không đúng. Bạn còn ${5 - nextFail} lần thử trước khi tài khoản bị khóa.`);
      }
      return;
    }

    setLoginError('');
    onLoginSuccess(loginRole, loginEmail);
    onClose();
  };

  const handleQuickDemoFill = (role: UserRole, email: string) => {
    setLoginRole(role);
    setLoginEmail(email);
    setLoginPassword('123456');
    setLoginError('');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegSuccessMsg('Đăng ký tài khoản Seller thành công! Bạn có thể đăng nhập ngay.');
    setTimeout(() => {
      setMode('login');
      setRegSuccessMsg('');
    }, 1500);
  };

  // Forgot Step 1: Request OTP
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError('Vui lòng nhập Email hoặc Số điện thoại');
      return;
    }
    setForgotError('');
    setForgotSuccessMsg(`Mã OTP (6 chữ số demo: 888999) đã được gửi đến ${forgotIdentifier}. Hiệu lực 10 phút.`);
    setForgotStep(2);
  };

  // Forgot Step 2: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== '888999' && otpCode !== '123456') {
      const left = otpAttemptsLeft - 1;
      setOtpAttemptsLeft(left);
      if (left <= 0) {
        setForgotError('Vượt quá 5 lần nhập sai OTP. Yêu cầu đã bị hủy.');
        setForgotStep(1);
      } else {
        setForgotError(`Mã OTP không chính xác. Còn ${left} lần thử.`);
      }
      return;
    }
    setForgotError('');
    setForgotSuccessMsg('Xác thực OTP thành công! Vui lòng nhập mật khẩu mới.');
    setForgotStep(3);
  };

  // Forgot Step 3: Reset Password
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setForgotError('Mật khẩu mới phải từ 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Xác nhận mật khẩu không khớp với mật khẩu mới');
      return;
    }

    setForgotError('');
    setForgotSuccessMsg('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
    setTimeout(() => {
      setMode('login');
      setForgotStep(1);
      setForgotSuccessMsg('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-slate-700 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'login' ? 'Đăng Nhập E-Logistic' : mode === 'register' ? 'Đăng Ký Đối Tác' : 'Khôi Phục Mật Khẩu'}
              </h3>
              <p className="text-[10px] text-slate-400">Cổng xác thực an toàn JWT & OTP Audit Log</p>
            </div>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 rounded-lg transition ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Đăng Nhập
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 rounded-lg transition ${mode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Đăng Ký
          </button>
          <button
            onClick={() => setMode('forgot')}
            className={`flex-1 py-1.5 rounded-lg transition ${mode === 'forgot' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Quên Mật Khẩu
          </button>
        </div>

        {/* MODE: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{loginError}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email / Số Điện Thoại</label>
              <input
                type="text"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-300">Mật Khẩu</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Vai Trò Đăng Nhập</label>
              <select
                value={loginRole}
                onChange={(e) => setLoginRole(e.target.value as UserRole)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-bold text-cyan-300"
              >
                <option value="ADMIN" className="bg-slate-900">Quản Trị Viên (ADMIN)</option>
                <option value="SELLER" className="bg-slate-900">Chủ Hàng / Merchant (SELLER)</option>
                <option value="DRIVER" className="bg-slate-900">Tài Xế Giao Hàng (DRIVER)</option>
              </select>
            </div>

            {/* Quick Demo Credentials Autofill */}
            <div className="pt-2">
              <span className="text-[10px] text-slate-400 block mb-1.5 font-bold uppercase">Thử Nhanh Với Tài Khoản Mẫu:</span>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleQuickDemoFill('ADMIN', 'admin@elogistic.vn')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 font-semibold text-center"
                >
                  Admin Portal
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoFill('SELLER', 'seller@anbinhpharm.com')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-semibold text-center"
                >
                  Seller Hub
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoFill('DRIVER', 'hung.driver@elogistic.vn')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-center"
                >
                  Tài Xế
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl shimmer-btn text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Đăng Nhập Ngay
            </button>
          </form>
        )}

        {/* MODE: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            {regSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                ✓ {regSuccessMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Họ & Tên / Tên Doanh Nghiệp</label>
              <input
                type="text"
                required
                placeholder="VD: Công ty Dược Phẩm Phương Nam"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Công Ty</label>
              <input
                type="email"
                required
                placeholder="contact@phuongnam.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Số Điện Thoại Liên Hệ</label>
              <input
                type="text"
                required
                placeholder="0912345678"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl shimmer-btn text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Đăng Ký Tài Khoản Seller
            </button>
          </form>
        )}

        {/* MODE: FORGOT PASSWORD 3-STEP OTP FLOW */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {forgotSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                ✓ {forgotSuccessMsg}
              </div>
            )}
            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                ⚠️ {forgotError}
              </div>
            )}

            {/* Step indicators */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-2">
              <span className={forgotStep === 1 ? 'text-blue-400' : ''}>1. Yêu Cầu OTP</span>
              <span className={forgotStep === 2 ? 'text-blue-400' : ''}>2. Nhập OTP</span>
              <span className={forgotStep === 3 ? 'text-blue-400' : ''}>3. Mật Khẩu Mới</span>
            </div>

            {forgotStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nhập Email hoặc Số Điện Thoại đăng ký</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: admin@elogistic.vn"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  Gửi Mã OTP Xác Thực ➔
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nhập Mã OTP (6 Chữ Số Demo: 888999)</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-cyan-300"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 cursor-pointer"
                >
                  Xác Thực OTP
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Mật Khẩu Mới (≥ 6 ký tự)</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Xác Nhận Mật Khẩu Mới</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  Đổi Mật Khẩu & Đăng Nhập Lại
                </button>
              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
