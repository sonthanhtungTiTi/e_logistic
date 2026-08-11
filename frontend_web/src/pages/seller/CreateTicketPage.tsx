import React, { useState } from 'react';
import { HelpCircle, Send } from 'lucide-react';
import { useNavigate } from 'react-router';

export const CreateTicketPage: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Tạo ticket khiếu nại thành công!');
    navigate('/seller/tickets');
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-2xl font-black text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-indigo-400" /> Gửi Yêu Cầu Hỗ Trợ / Khiếu Nại
        </h3>
        <p className="text-xs text-slate-400">Bộ phận CSKH E-Logistic sẽ phản hồi trong vòng 15 phút</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Mã Vận Đơn Liên Quan</label>
          <input type="text" required value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="VN-LOG-..." className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Vấn Đề Cần Hỗ Trợ</label>
          <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ví dụ: Đổi địa chỉ giao nhận..." className="w-full glass-input rounded-xl px-3 py-2 text-xs" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Chi Tiết Yêu Cầu</label>
          <textarea rows={4} required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Mô tả cụ thể lý do khiếu nại..." className="w-full glass-input rounded-xl px-3 py-2 text-xs" />
        </div>

        <button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2">
          <Send className="w-4 h-4" /> Gửi Yêu Cầu Hỗ Trợ
        </button>
      </form>
    </div>
  );
};
