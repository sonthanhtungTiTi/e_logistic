import React from 'react';
import { X, ShieldAlert, FileText, CheckCircle2, Scale } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
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
            <div className="p-2.5 rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                ĐIỀU KHOẢN & QUY ĐỊNH DỊCH VỤ VẬN TẢI E-LOGISTICS
              </h3>
              <p className="text-xs text-slate-500">
                Quy định sử dụng dịch vụ giao nhận, gửi hàng & trách nhiệm các bên
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
          
          <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200/60 text-cyan-900 flex items-start gap-2.5">
            <Scale className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
            <div>
              Văn bản Điều khoản & Quy định này cấu thành Thỏa thuận có hiệu lực pháp lý giữa <strong>Chủ hàng (Seller / Khách gửi)</strong> và <strong>Nền tảng Quản lý Vận tải E-Logistics</strong>. Vui lòng đọc kỹ trước khi đăng ký tài khoản.
            </div>
          </div>

          {/* Chương 1 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
              CHƯƠNG I: QUY ĐỊNH CHUNG & TÀI KHOẢN NGƯỜI DÙNG
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>1.1. Điều kiện đăng ký:</strong> Chủ hàng phải từ đủ 18 tuổi hoặc có tư cách pháp nhân hợp pháp theo quy định pháp luật Việt Nam.</li>
              <li><strong>1.2. Chính xác thông tin:</strong> Người dùng cam kết khai báo thông tin chính xác về tên shop, địa chỉ kho gửi, số điện thoại và email Google xác thực OTP.</li>
              <li><strong>1.3. Bảo mật tài khoản:</strong> Chủ hàng chịu trách nhiệm bảo quản thông tin đăng nhập và mật khẩu. Không chia sẻ quyền truy cập cho bên thứ ba không thẩm quyền.</li>
            </ul>
          </section>

          {/* Chương 2 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-rose-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              CHƯƠNG II: DANH MỤC HÀNG HÓA CẤM VẬN CHUYỂN
            </h4>
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 space-y-1.5">
              <p className="font-bold">E-Logistics nghiêm cấm gửi các vật phẩm thuộc danh mục cấm theo Luật Bưu chính Việt Nam:</p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-800">
                <li>Vũ khí, khí tài quân sự, vật liệu nổ, chất dễ cháy, chất độc hóa học hoặc nguy hiểm sinh học.</li>
                <li>Ma túy, chất gây nghiện, các chất hướng thần bị pháp luật cấm lưu hành.</li>
                <li>Tiền tệ Việt Nam, ngoại tệ, kim khí quý, đá quý hoặc giấy tờ có giá trị như tiền.</li>
                <li>Hàng giả, hàng nhái thương hiệu, hàng nhập lậu hoặc hàng hóa vi phạm quyền sở hữu trí tuệ.</li>
                <li>Vật phẩm, hàng hóa tươi sống hoặc thịt động vật hoang dã không có kiểm dịch.</li>
              </ul>
            </div>
          </section>

          {/* Chương 3 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
              CHƯƠNG III: QUY CHUẨN ĐÓNG GÓI & KHAI BÁO CÂN NẶNG
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>3.1. Quy chuẩn đóng gói:</strong> Chủ hàng có trách nhiệm đóng gói hàng hóa bằng thùng carton, bọc xốp bóng khí (Bubble wrap) chống va đập, niêm phong băng keo cẩn thận. Với hàng dễ vỡ phải dán tem cảnh báo "Hàng Dễ Vỡ".</li>
              <li><strong>3.2. Khai báo trọng lượng:</strong> Cước phí vận chuyển dựa trên trọng lượng quy đổi <code>max(Actual, Volumetric Weight = Dài x Rộng x Cao / 5000)</code>.</li>
              <li><strong>3.3. Đo cân thực tế tại kho:</strong> Khi hàng về Bưu cục (UC-16 Inbound), kho sẽ tiến hành đo cân thực tế. Nếu trọng lượng kho đo lệch quá 50g so với khai báo, hệ thống tự động phạt và tính cước điều chỉnh (<code>FEE_ADJUSTMENT_TRIGGERED</code>).</li>
            </ul>
          </section>

          {/* Chương 4 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
              CHƯƠNG IV: QUY ĐỊNH BẢO HIỂM, BỒI THƯỜNG & VÍ COD
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>4.1. Khai giá & Phụ phí bảo hiểm:</strong> Đơn hàng có giá trị khai báo trên 1.000.000 VNĐ bắt buộc đóng phụ phí bảo hiểm hàng hóa (0.5% giá trị khai báo).</li>
              <li><strong>4.2. Mức bồi thường khi mất/hỏng:</strong>
                <ul className="list-circle pl-5 mt-1 space-y-1 text-slate-500">
                  <li>Đơn hàng có mua bảo hiểm: Đền bù 100% giá trị hàng hóa khai báo (tối đa 20.000.000 VNĐ).</li>
                  <li>Đơn hàng không mua bảo hiểm: Đền bù tối đa 4 lần giá trị cước phí vận chuyển.</li>
                </ul>
              </li>
              <li><strong>4.3. Ví tiền COD:</strong> Ngay khi Shipper giao hàng thành công (<code>DELIVERED</code>), tiền thu hộ COD tự động được cộng vào Ví COD của Chủ hàng. Chủ hàng có quyền tạo lệnh rút tiền về Ngân hàng tối thiểu từ 50.000 VNĐ/giao dịch.</li>
            </ul>
          </section>

          {/* Chương 5 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
              CHƯƠNG V: GIẢI QUYẾT TRANH CHẤP & XỬ LÝ KHIẾU NẠI
            </h4>
            <p className="text-slate-600">
              Mọi khiếu nại về hư hỏng, mất mát hoặc thời gian giao hàng được tiếp nhận trong vòng 07 ngày kể từ khi đơn hàng hoàn tất qua tính năng <strong>Gửi Vé Hỗ Trợ CSKH (Ticket System)</strong> trên trang quản trị.
            </p>
          </section>

        </div>

        {/* Modal Footer - Light Theme */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Bằng việc nhấn "Tôi Đồng Ý", bạn cam kết tuân thủ đầy đủ quy định trên.
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
                Tôi Đồng Ý &amp; Đóng
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
