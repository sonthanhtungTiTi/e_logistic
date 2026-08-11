import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { KeyRound, Mail, Phone, Lock, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '../../api/auth.api';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // State quản lý bước (Step 1, 2, 3)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Inputs
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userId, setUserId] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  
  // Feedback Messages & Loading
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP Countdown Timer (10 phút = 600s)
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ------------------------------------------------------------
  // BƯỚC 1: Kiểm tra tài khoản & Yêu cầu gửi OTP
  // ------------------------------------------------------------
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập Email hoặc Số điện thoại đã đăng ký.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword(identifier.trim());
      const data = response.data;

      setUserId(data.userId);
      setChannel(data.channel || (identifier.includes('@') ? 'email' : 'sms'));
      setSuccessMessage(data.message || 'Mã OTP đã được gửi thành công!');
      
      // Chuyển sang Bước 2 & Khởi tạo đếm ngược 10 phút
      setStep(2);
      setTimeLeft(600);
      setCanResend(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể gửi mã xác thực. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (loading) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const response = await authApi.forgotPassword(identifier.trim());
      setSuccessMessage(response.data.message || 'Mã OTP mới đã được gửi lại!');
      setTimeLeft(600);
      setCanResend(false);
      setOtp('');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gửi lại OTP thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // BƯỚC 2: Xác thực mã OTP 6 chữ số
  // ------------------------------------------------------------
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (otp.length !== 6) {
      setErrorMessage('Mã OTP phải bao gồm đúng 6 chữ số.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.verifyOtp({ userId, otp: otp.trim() });
      setSuccessMessage(response.data.message || 'Xác thực OTP thành công!');
      
      // Chuyển sang Bước 3
      setStep(3);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.';
      setErrorMessage(msg);

      // Nếu nhập sai quá số lần quy định, quay lại bước 1
      if (msg.includes('thực hiện lại từ đầu') || msg.includes('hủy')) {
        setTimeout(() => {
          setStep(1);
          setOtp('');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // BƯỚC 3: Cập nhật Mật khẩu mới
  // ------------------------------------------------------------
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword({
        userId,
        newPassword,
        confirmNewPassword,
      });

      setSuccessMessage(response.data.message || 'Đặt lại mật khẩu thành công! Đang chuyển đến màn hình Đăng nhập...');

      // Tự động chuyển về Đăng nhập sau 2.5s
      setTimeout(() => {
        navigate('/auth/login');
      }, 2500);

    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden bg-[#0c1222]/90 backdrop-blur-xl">
        
        {/* Decorative Top Accent Glow */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Form Title & Icon Header */}
        <div className="text-center space-y-3 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
            <KeyRound className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">Khôi Phục Mật Khẩu</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Xác thực Google Email / SMS OTP bảo mật 3 bước</p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-800'}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-800'}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-800'}`} />
          </div>
          <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1">
            <span className={step === 1 ? 'text-emerald-400' : ''}>1. Nhập Email/SĐT</span>
            <span className={step === 2 ? 'text-emerald-400' : ''}>2. Xác Thực OTP</span>
            <span className={step === 3 ? 'text-emerald-400' : ''}>3. Mật Khẩu Mới</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="font-medium leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* ============================================================ */}
        {/* BƯỚC 1: NHẬP EMAIL/SĐT */}
        {/* ============================================================ */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Email hoặc Số Điện Thoại Đã Đăng Ký
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full glass-input rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                  placeholder="seller@domain.com hoặc 0912345678"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {identifier.includes('@') ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Mã OTP 6 số sẽ được gửi trực tiếp đến Email/SMS đã đăng ký trên hệ thống.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang kiểm tra & gửi mã OTP...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Gửi Mã Xác Thực OTP ➔
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* BƯỚC 2: NHẬP MÃ OTP */}
        {/* ============================================================ */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Kênh gửi mã:</div>
              <div className="font-semibold text-emerald-400 truncate flex items-center gap-1.5">
                {channel === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                {identifier}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Mã OTP 6 Chữ Số
                </label>
                <span className={`text-[11px] font-mono font-bold ${timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  Thời gian: {formatTime(timeLeft)}
                </span>
              </div>
              <input
                type="text"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full glass-input rounded-2xl px-4 py-3.5 text-center text-xl font-mono tracking-[0.6em] text-emerald-400 font-bold border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-sans placeholder:text-slate-600"
                placeholder="• • • • • •"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Vui lòng kiểm tra hộp thư đến (hoặc thư rác / Spam) email của bạn.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || timeLeft === 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xác thực OTP...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Xác Nhận Mã OTP ➔
                </>
              )}
            </button>

            {/* Re-send OTP Button */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => { setStep(1); setErrorMessage(null); }}
                className="text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Đổi Email/SĐT
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend && timeLeft > 0}
                className={`flex items-center gap-1 font-semibold transition cursor-pointer ${
                  canResend || timeLeft === 0
                    ? 'text-emerald-400 hover:text-emerald-300 underline'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Gửi lại mã OTP
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* BƯỚC 3: NHẬP MẤT KHẨU MỚI */}
        {/* ============================================================ */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Mật Khẩu Mới
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input rounded-2xl pl-10 pr-10 py-3 text-xs text-white border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                  placeholder="Nhập ít nhất 6 ký tự..."
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Xác Nhận Mật Khẩu Mới
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full glass-input rounded-2xl pl-10 pr-10 py-3 text-xs text-white border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                  placeholder="Nhập lại mật khẩu mới..."
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmNewPassword}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang cập nhật mật khẩu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Hoàn Tất Đặt Lại Mật Khẩu ➔
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="text-center text-xs text-slate-400 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <Link to="/auth/login" className="text-blue-400 font-bold hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại Đăng nhập
          </Link>
          <span className="text-[11px] text-slate-500">Hỗ trợ 24/7</span>
        </div>

      </div>
    </div>
  );
};
