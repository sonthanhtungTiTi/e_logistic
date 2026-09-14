import React from 'react';
import { X, ShieldCheck, Lock, CheckCircle2, Server, EyeOff, UserCheck } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800">
        
        {/* Header - Light Theme */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                CHÍNH SÁCH BẢO MẬT THÔNG TIN DỮ LIỆU CÁ NHÂN
              </h3>
              <p className="text-xs text-slate-500">
                Cam kết tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 leading-relaxed custom-scrollbar flex-1">
          
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-900 flex items-start gap-2.5">
            <Lock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              E-Logistics cam kết tôn trọng và bảo vệ tuyệt đối quyền riêng tư cùng thông tin cá nhân của Chủ hàng và Khách nhận hàng. Chúng tôi triển khai các tiêu chuẩn mã hóa quốc tế để chống rò rỉ dữ liệu.
            </div>
          </div>

          {/* Mục 1 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              1. THU THẬP THÔNG TIN CÁ NHÂN
            </h4>
            <p>Chúng tôi chỉ thu thập các thông tin cần thiết phục vụ vận hành và xử lý đơn hàng logistics:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Thông tin tài khoản Shop:</strong> Tên cửa hàng/doanh nghiệp, Email xác thực Google Mail, Số điện thoại liên hệ di động.</li>
              <li><strong>Thông tin xác minh KYC:</strong> Ảnh chụp Căn cước công dân (CCCD) / Giấy phép kinh doanh phục vụ duyệt hạn mức rút tiền ví COD.</li>
              <li><strong>Thông tin giao nhận đơn hàng:</strong> Tên người nhận, số điện thoại, địa chỉ nhận hàng và tọa độ vị trí GPS giao nhận.</li>
            </ul>
          </section>

          {/* Mục 2 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              2. MỤC ĐÍCH SỬ DỤNG THÔNG TIN
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>Gửi mã xác thực OTP 6 chữ số trực tiếp qua Gmail khi đăng ký/đặt lại mật khẩu.</li>
              <li>Phục vụ thuật toán Auto-Dispatch gán Shipper lấy hàng và giao hàng chặng cuối.</li>
              <li>Cập nhật trạng thái đơn hàng theo thời gian thực (Realtime WebSocket) và hiển thị live GPS trên bản đồ tracking.</li>
              <li>Bảo vệ chống các hành vi truy cập trái phép, tấn công brute-force và gian lận thương mại.</li>
            </ul>
          </section>

          {/* Mục 3 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <EyeOff className="w-4 h-4 text-emerald-600" />
              3. CAM KẾT KHÔNG CHIA SẺ CHO BÊN THỨ BA
            </h4>
            <p className="text-slate-600">
              E-Logistics **tuyệt đối không mua bán, trao đổi hoặc tiết lộ** thông tin cá nhân hay lịch sử giao dịch của Chủ hàng cho bất kỳ bên thứ ba nào vì mục đích quảng cáo/thương mại. 
            </p>
            <p className="text-slate-600">
              Thông tin chỉ được chia sẻ trong trường hợp có yêu cầu bằng văn bản chính thức từ cơ quan quản lý nhà nước có thẩm quyền theo quy định của pháp luật Việt Nam.
            </p>
          </section>

          {/* Mục 4 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <Server className="w-4 h-4 text-emerald-600" />
              4. BIỆN PHÁP KỸ THUẬT BẢO MẬT DỮ LIỆU
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Bảo mật Mật khẩu:</strong> Mật khẩu người dùng được băm mã hóa một chiều bằng thuật toán <code>bcryptjs</code> với Salt factor = 10 trước khi lưu DB.</li>
              <li><strong>Mã hóa đường truyền SSL/TLS 256-bit:</strong> Tất cả kết nối API và Socket giữa Trình duyệt và Server đều được mã hóa an toàn.</li>
              <li><strong>Bảo vệ Ảnh KYC Anti-IDOR:</strong> File ảnh CCCD được lưu trữ trong thư mục riêng tư và chỉ stream dữ liệu thông qua API kiểm tra token JWT hợp lệ.</li>
              <li><strong>Khóa an ninh brute-force:</strong> Tự động khóa tài khoản sau 5 lần nhập sai mật khẩu để ngăn chặn dò mật khẩu tự động.</li>
            </ul>
          </section>

          {/* Mục 5 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              5. QUYỀN CỦA CHỦ SỞ HỮU DỮ LIỆU
            </h4>
            <p className="text-slate-600">
              Người dùng có quyền kiểm tra, trích xuất, cập nhật thông tin cá nhân hoặc yêu cầu tạm khóa/xóa tài khoản thông qua phần Cài đặt Hồ sơ (`/profile`) hoặc gửi Yêu cầu Hỗ trợ CSKH.
            </p>
          </section>

        </div>

        {/* Modal Footer - Light Theme */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Dữ liệu cá nhân của bạn luôn được bảo vệ an toàn theo tiêu chuẩn ISO/IEC 27001.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer transition"
            >
              Đóng
            </button>
            {onAccept && (
              <button
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md cursor-pointer transition"
              >
                Tôi Đã Hiểu &amp; Đóng
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
