import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { UserCheck, Store, Phone, Mail, Lock, Eye, EyeOff, ShieldCheck, RefreshCw, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';
import { VietnamAddressSelector } from '../../components/shared/VietnamAddressSelector';
import type { VietnamAddressData } from '../../components/shared/VietnamAddressSelector';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Registration Step: 1 = Registration Info, 2 = Google Email OTP Verification
  const [regStep, setRegStep] = useState<1 | 2>(1);

  // Form Fields
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Loading & Feedback messages
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // OTP Countdown (10 mins)
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [canResend, setCanResend] = useState(false);

  // Address State with Vietnam administrative divisions API
  const [addressData, setAddressData] = useState<VietnamAddressData>({
    province: '',
    district: '',
    ward: '',
    address: '',
    note: '',
  });

  // Timer for OTP expiration in Step 2
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (regStep === 2 && timeLeft > 0) {
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
  }, [regStep, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ------------------------------------------------------------
  // BƯỚC 1: Kiểm tra thông tin & Gửi mã OTP xác thực Email
  // ------------------------------------------------------------
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!storeName.trim()) {
      setErrorMsg('Vui lòng nhập Tên cửa hàng / Doanh nghiệp.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập Email xác thực (Google Mail) hợp lệ.');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 9) {
      setErrorMsg('Vui lòng nhập số điện thoại liên hệ hợp lệ.');
      return;
    }
    if (!addressData.province || !addressData.district || !addressData.ward) {
      setErrorMsg('Vui lòng chọn đầy đủ Tỉnh/TP, Quận/Huyện và Phường/Xã.');
      return;
    }
    if (!addressData.address.trim()) {
      setErrorMsg('Vui lòng nhập Tòa nhà, hẻm, đường kho nhận hàng.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu nhập lại không khớp.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Vui lòng đồng ý với Điều khoản & Quy định và Chính sách bảo mật.');
      return;
    }

    setLoading(true);
    try {
      // Gửi OTP xác thực đến Google Email qua Nodemailer Gmail SMTP
      const response = await authApi.sendRegisterOtp(email.trim());
      setSuccessMsg(response.data.message || `Mã OTP đã được gửi đến Google Email ${email.trim()}`);
      
      // Chuyển sang Bước 2 (Nhập OTP)
      setRegStep(2);
      setTimeLeft(600);
      setCanResend(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Không thể gửi email xác thực OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP xác thực
  const handleResendRegisterOtp = async () => {
    if (loading) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const response = await authApi.sendRegisterOtp(email.trim());
      setSuccessMsg(response.data.message || 'Mã OTP mới đã được gửi lại Gmail của bạn!');
      setTimeLeft(600);
      setCanResend(false);
      setOtp('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gửi lại OTP thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // BƯỚC 2: Xác thực mã OTP & Hoàn tất Đăng ký
  // ------------------------------------------------------------
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (otp.length !== 6) {
      setErrorMsg('Mã OTP phải gồm đúng 6 chữ số.');
      return;
    }

    setLoading(true);
    try {
      // BƯỚC A: Xác thực mã OTP với Backend
      await authApi.verifyRegisterOtp({ email: email.trim(), otp: otp.trim() });

      // BƯỚC B: Tiến hành đăng ký tài khoản chính thức
      const regResponse = await authApi.register({
        fullName: storeName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        confirmPassword,
      });

      setSuccessMsg('Xác thực Email & Đăng ký tài khoản thành công! Đang đăng nhập...');

      const user = regResponse.data;
      
      // Đăng nhập người dùng vào context
      login(user.accessToken || 'seller-jwt-token', {
        id: user._id || `SELLER-${Date.now()}`,
        email: user.email,
        fullName: user.fullName,
        role: user.role || 'SELLER',
        phoneNumber,
      });

      setTimeout(() => {
        navigate('/seller/dashboard');
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Xác thực OTP hoặc Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-xl glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6 shadow-2xl bg-[#0c1222]/90 backdrop-blur-xl relative overflow-hidden">
        
        {/* Top Decorative Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Form Title & Login Redirect Link */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-white tracking-tight">Đăng ký dịch vụ</h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Gmail OTP Protected
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Bạn đã có tài khoản E-Logistic?{' '}
            <Link to="/auth/login" className="text-emerald-400 font-bold hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center gap-2 pt-1">
          <div className={`flex-1 h-1.5 rounded-full transition-all ${regStep >= 1 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-800'}`} />
          <div className={`flex-1 h-1.5 rounded-full transition-all ${regStep >= 2 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-800'}`} />
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* ============================================================ */}
        {/* BƯỚC 1: KHAI BÁO THÔNG TIN ĐĂNG KÝ */}
        {/* ============================================================ */}
        {regStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            
            {/* Store Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tên cửa hàng / Doanh nghiệp *</label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="VD: Công Ty Dược An Bình"
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Email Field (Google Mail OTP) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email xác thực (Google Mail) *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: merchant@gmail.com"
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Mã OTP xác thực sẽ được gửi trực tiếp đến Email Google này để bảo mật tài khoản.
              </p>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Điện thoại liên hệ *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="VD: 0901234567"
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Dynamic Vietnam Administrative Location Selector */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                CẤU HÌNH ĐỊA CHỈ KHO / CỬA HÀNG LẤY HÀNG
              </span>
              <VietnamAddressSelector
                value={addressData}
                onChange={setAddressData}
                layout="grid"
                showNoteField={true}
                darkTheme={true}
              />
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mật khẩu *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full glass-input rounded-xl pl-10 pr-10 py-2.5 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nhập lại mật khẩu *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Xác nhận mật khẩu"
                    className="w-full glass-input rounded-xl pl-10 pr-10 py-2.5 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Help Support & Terms Agreement */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-500 focus:ring-0"
                />
                <span>
                  Tôi đã đọc và đồng ý với{' '}
                  <span className="text-blue-400 font-bold underline">Điều khoản & Quy định</span> và{' '}
                  <span className="text-blue-400 font-bold underline">Chính sách bảo mật</span>
                </span>
              </label>
            </div>

            {/* Next Step / Send OTP Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang gửi mã OTP đến Gmail...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Tiếp Tục: Gửi Mã Xác Thực OTP ➔
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* BƯỚC 2: NHẬP MÃ OTP XÁC THỰC EMAIL */}
        {/* ============================================================ */}
        {regStep === 2 && (
          <form onSubmit={handleVerifyAndRegister} className="space-y-5">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400">Mã OTP 6 số đã được gửi tới Google Email:</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-2 font-mono">
                <Mail className="w-4 h-4" />
                {email}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Nhập Mã OTP Xác Thực (6 Chữ Số) *
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
                className="w-full glass-input rounded-2xl px-4 py-3.5 text-center text-2xl font-mono tracking-[0.6em] text-emerald-400 font-bold border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-sans placeholder:text-slate-600"
                placeholder="• • • • • •"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Vui lòng kiểm tra hộp thư đến (hoặc thư rác / Spam) trong tài khoản Gmail của bạn.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || timeLeft === 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xác thực & Tạo tài khoản...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Xác Thực OTP & Hoàn Tất Đăng Ký ➔
                </>
              )}
            </button>

            {/* Controls */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setRegStep(1); setErrorMsg(null); }}
                className="text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Chỉnh sửa thông tin
              </button>

              <button
                type="button"
                onClick={handleResendRegisterOtp}
                disabled={!canResend && timeLeft > 0}
                className={`flex items-center gap-1 font-semibold transition cursor-pointer ${
                  canResend || timeLeft === 0
                    ? 'text-emerald-400 hover:text-emerald-300 underline'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Gửi lại OTP đến Gmail
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
