import React from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert, ArrowRight, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';

export interface KycRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  kycStatus?: string;
  customMessage?: string;
}

export const KycRequiredModal: React.FC<KycRequiredModalProps> = ({
  isOpen,
  onClose,
  kycStatus = 'NOT_SUBMITTED',
  customMessage,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToKyc = () => {
    onClose();
    navigate('/seller/profile');
  };

  const getStatusBadge = () => {
    switch (kycStatus) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <AlertCircle className="w-3.5 h-3.5" /> Hồ sơ đang được phê duyệt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <X className="w-3.5 h-3.5" /> Hồ sơ bị từ chối - Cần cập nhật lại
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" /> Chưa gửi hồ sơ xác minh KYC
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 text-white shadow-2xl shadow-cyan-500/10 space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Glowing Shield Icon */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-sky-400/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/20">
              <ShieldAlert className="w-10 h-10 animate-pulse text-cyan-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
              !
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-white">
              Cần Hoàn Tất Xác Minh KYC
            </h3>
            <p className="text-xs text-cyan-400 font-medium">
              Yêu cầu bắt buộc trước khi khởi tạo vận đơn
            </p>
          </div>

          {/* Status Badge */}
          <div className="pt-1">{getStatusBadge()}</div>
        </div>

        {/* Notice Box */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-cyan-500/30 text-xs text-cyan-100 leading-relaxed space-y-2">
          <p className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            Tại sao cần xác minh KYC?
          </p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {customMessage ||
              'Theo quy định an toàn vận chuyển và đối soát dòng tiền COD, Shop của bạn cần hoàn tất cập nhật CCCD/CMND hoặc Giấy phép kinh doanh trước khi có thể tạo và phát hành vận đơn.'}
          </p>
        </div>

        {/* Benefits Checklist */}
        <div className="space-y-2 text-xs text-slate-300 pl-1">
          <div className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Tự động đối soát và nhận tiền COD tức thì vào Ví</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Được ưu tiên phân gán Shipper lấy hàng nhanh</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Hưởng đầy đủ quyền lợi bảo hiểm & đền bù đơn hàng</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={handleGoToKyc}
            className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition cursor-pointer"
          >
            Xác Minh KYC Ngay <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
