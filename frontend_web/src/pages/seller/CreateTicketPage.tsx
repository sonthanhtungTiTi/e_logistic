import React, { useState } from 'react';
import { HelpCircle, Send, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import { ticketApi } from '../../api/ticket.api';

export const CreateTicketPage: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [category, setCategory] = useState('DELIVERY_DELAY');
  const [priority, setPriority] = useState('NORMAL');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tiêu đề và nội dung khiếu nại');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await ticketApi.createTicket({
        trackingCode: trackingNumber.trim().toUpperCase(),
        category,
        priority,
        subject: subject.trim(),
        content: content.trim(),
      });

      if (res.data?.success) {
        navigate('/seller/tickets');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi tạo ticket. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-indigo-500" /> Gửi Yêu Cầu Hỗ Trợ / Khiếu Nại
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Đội ngũ CSKH GIAO HÀNG sẽ tiếp nhận và phản hồi nhanh chóng</p>
        </div>
        <Link
          to="/seller/tickets"
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-600/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Phân loại vấn đề <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="DELIVERY_DELAY">Giao trễ tiến độ SLA</option>
              <option value="DAMAGED_GOODS">Hàng bể vỡ / Hư hỏng</option>
              <option value="LOST_GOODS">Nghi vấn thất lạc kiện hàng</option>
              <option value="COD_DISPUTE">Sai lệch tiền thu hộ COD</option>
              <option value="ADDRESS_CHANGE">Đổi địa chỉ / SĐT người nhận</option>
              <option value="OTHER">Vấn đề khác</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mức độ ưu tiên</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="LOW">Thấp (Chờ xử lý thông thường)</option>
              <option value="NORMAL">Bình thường</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">🚨 Khẩn cấp (Hàng nhạy cảm/Đền bù)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mã Vận Đơn Liên Quan (Tùy chọn)</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
            placeholder="VD: ELG-VN-10293847"
            className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white uppercase placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Tiêu đề yêu cầu <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ví dụ: Đơn hàng giao trễ 2 ngày chưa thấy cập nhật bưu cục..."
            className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Chi tiết nội dung khiếu nại <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={5}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Mô tả cụ thể bối cảnh, lý do cần khiếu nại hoặc thông tin bổ sung để nhân viên hỗ trợ nhanh nhất..."
            className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
        >
          {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu Hỗ Trợ'}
        </button>
      </form>
    </div>
  );
};
