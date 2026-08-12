import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Mail, CreditCard, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface CompleteShopInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CompleteShopInfoModal: React.FC<CompleteShopInfoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, updateUser } = useAuth();

  // Email verification state
  const [email, setEmail] = useState<string>(user?.email || 'shop@anbinhpharm.com');
  const [otpCode, setOtpCode] = useState<string>('');
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(user?.isEmailVerified ?? false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bank Info state
  const [bankName, setBankName] = useState<string>(user?.bankName || '');
  const [bankBranch, setBankBranch] = useState<string>(user?.bankBranch || '');
  const [bankAccountName, setBankAccountName] = useState<string>(user?.bankAccountName || '');
  const [bankAccount, setBankAccount] = useState<string>(user?.bankAccount || '');
  const [isBankSaved, setIsBankSaved] = useState<boolean>(
    Boolean(user?.bankName && user?.bankAccount && user?.bankAccountName)
  );
  const [bankMsg, setBankMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Handle send OTP
  const handleSendOtp = () => {
    if (!email || !email.includes('@')) {
      setEmailMsg({ type: 'error', text: 'Vui lòng nhập địa chỉ email hợp lệ' });
      return;
    }
    setIsOtpSent(true);
    setEmailMsg({ type: 'success', text: 'Mã OTP (123456) đã được gửi đến email của bạn!' });
  };

  // Handle Verify Email
  const handleVerifyEmail = () => {
    if (otpCode.trim() === '123456' || otpCode.trim().length === 6) {
      setIsEmailVerified(true);
      setEmailMsg({ type: 'success', text: 'Xác thực email thành công!' });
      updateUser({ email, isEmailVerified: true });
    } else {
      setEmailMsg({ type: 'error', text: 'Mã OTP không đúng. Vui lòng thử lại (Dùng 123456).' });
    }
  };

  // Check if bank form is valid
  const isBankFormValid = Boolean(
    bankName.trim() && bankBranch.trim() && bankAccountName.trim() && bankAccount.trim()
  );

  // Handle Save Bank Info
  const handleSaveBankInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBankFormValid) {
      setBankMsg({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin ngân hàng' });
      return;
    }

    setIsBankSaved(true);
    setBankMsg({ type: 'success', text: 'Đã lưu thông tin tài khoản ngân hàng thành công!' });
    updateUser({
      bankName,
      bankBranch,
      bankAccountName: bankAccountName.toUpperCase(),
      bankAccount,
      isBankLinked: true,
    });

    if (isEmailVerified || user?.isEmailVerified) {
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800">
        
        {/* Header Bar matching Image 1 */}
        <div className="bg-[#00904A] text-white py-3.5 px-5 flex items-center justify-between relative">
          <div className="w-full text-center font-bold text-lg tracking-wide">
            Hoàn thiện thông tin shop
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3.5 text-white/90 hover:text-white text-xl font-bold cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto text-sm">
          
          {/* SECTION 1: EMAIL VERIFICATION */}
          <div className="space-y-3 pb-5 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#00904A]" />
                Xác thực email
                {isEmailVerified ? (
                  <span className="text-[#00904A] font-semibold text-sm"> / Đã xác thực</span>
                ) : (
                  <span className="text-red-500 font-semibold text-sm"> / Chưa xác thực</span>
                )}
              </h3>
            </div>

            <p className="text-slate-500 text-xs">Vui lòng nhập email để được xác thực thông tin</p>

            {/* Email + Get OTP Button */}
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                disabled={isEmailVerified}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#00904A] disabled:bg-slate-100 disabled:text-slate-500"
              />
              {!isEmailVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="bg-[#00904A] hover:bg-[#007a3e] text-white text-xs font-bold px-4 py-2.5 rounded-lg shrink-0 cursor-pointer transition whitespace-nowrap"
                >
                  Lấy OTP
                </button>
              )}
            </div>

            {/* OTP Input + Verify Button */}
            {!isEmailVerified && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Nhập mã OTP (Mặc định: 123456)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#00904A]"
                />
                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={!otpCode.trim()}
                  className={`text-xs font-bold px-5 py-2.5 rounded-lg shrink-0 transition whitespace-nowrap ${
                    otpCode.trim()
                      ? 'bg-[#00904A] hover:bg-[#007a3e] text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Xác thực
                </button>
              </div>
            )}

            {emailMsg && (
              <div
                className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                  emailMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {emailMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{emailMsg.text}</span>
              </div>
            )}
          </div>

          {/* SECTION 2: BANK INFORMATION */}
          <form onSubmit={handleSaveBankInfo} className="space-y-4 pb-5 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-base uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#00904A]" />
                THÔNG TIN NGÂN HÀNG
                {isBankSaved ? (
                  <span className="text-[#00904A] font-semibold text-sm lowercase font-normal"> / Đã điền</span>
                ) : (
                  <span className="text-red-500 font-semibold text-sm lowercase font-normal"> / Chưa liên kết</span>
                )}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Tài khoản ngân hàng shop điền dưới đây sẽ được sử dụng làm tài khoản đối soát với E-Logistic
              </p>
            </div>

            {/* Bank Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ngân hàng</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#00904A] bg-white text-slate-800"
              >
                <option value="">Bấm chọn ngân hàng</option>
                <option value="Vietcombank">Vietcombank - Ngân hàng TMCP Ngoại Thương</option>
                <option value="Techcombank">Techcombank - Ngân hàng Kỹ Thương</option>
                <option value="MBBank">MB Bank - Ngân hàng Quân Đội</option>
                <option value="VPBank">VPBank - Ngân hàng Việt Nam Thịnh Vượng</option>
                <option value="BIDV">BIDV - Ngân hàng ĐT & Phát Triển</option>
                <option value="Agribank">Agribank - Nông nghiệp & PT Nông thôn</option>
                <option value="Sacombank">Sacombank - Sài Gòn Thương Tín</option>
                <option value="ACB">ACB - Ngân hàng Á Châu</option>
                <option value="TPBank">TPBank - Ngân hàng Tiên Phong</option>
                <option value="VietinBank">VietinBank - Ngân hàng Công Thương</option>
              </select>
            </div>

            {/* Branch Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chi nhánh ngân hàng</label>
              <select
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#00904A] bg-white text-slate-800"
              >
                <option value="">Bấm chọn chi nhánh ngân hàng</option>
                <option value="Chi nhánh TP. Hồ Chí Minh">Chi nhánh TP. Hồ Chí Minh</option>
                <option value="Chi nhánh Hà Nội">Chi nhánh Hà Nội</option>
                <option value="Chi nhánh Tân Bình">Chi nhánh Tân Bình</option>
                <option value="Chi nhánh Quận 1">Chi nhánh Quận 1</option>
                <option value="Chi nhánh Quận 5">Chi nhánh Quận 5</option>
                <option value="Chi nhánh Đà Nẵng">Chi nhánh Đà Nẵng</option>
                <option value="Chi nhánh Cần Thơ">Chi nhánh Cần Thơ</option>
                <option value="Chi nhánh Hải Phòng">Chi nhánh Hải Phòng</option>
              </select>
            </div>

            {/* Account Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản</label>
              <input
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                placeholder="Chủ tài khoản ngân hàng (VD: NGUYEN VAN A)"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#00904A] uppercase"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số tài khoản</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Số tài khoản ngân hàng"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#00904A] font-mono"
              />
            </div>

            {bankMsg && (
              <div
                className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                  bankMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {bankMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{bankMsg.text}</span>
              </div>
            )}

            {/* Save Button */}
            <button
              type="submit"
              disabled={!isBankFormValid}
              className={`w-full py-3 rounded-lg text-xs font-bold transition shadow-md ${
                isBankFormValid
                  ? 'bg-[#00904A] hover:bg-[#007a3e] text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              Lưu thông tin
            </button>
          </form>

          {/* SECTION 3: BANK LINK NOTE */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-base uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00904A]" />
              LIÊN KẾT NGÂN HÀNG
              <span className="text-[#00904A] font-semibold text-sm lowercase font-normal"> / Đã liên kết</span>
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Liên kết ngân hàng giúp thanh toán nhanh chóng và tiện lợi hơn. Tuy nhiên tính năng này chỉ có sẵn trên nền tảng app, vui lòng tải hoặc mở app để cập nhật và trải nghiệm
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
