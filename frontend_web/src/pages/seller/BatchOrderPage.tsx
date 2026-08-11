import React from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

export const BatchOrderPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-2xl font-black text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-cyan-400" /> Nhập Đơn Hàng Hàng Loạt (Excel / CSV)
        </h3>
        <p className="text-xs text-slate-400">Tải lên file danh sách đơn hàng để xử lý tự động hàng trăm vận đơn</p>
      </div>

      <div className="glass-panel p-10 rounded-3xl border-2 border-dashed border-slate-700 text-center space-y-4 hover:border-cyan-500 transition cursor-pointer">
        <Upload className="w-10 h-10 text-cyan-400 mx-auto animate-bounce" />
        <div>
          <h4 className="font-bold text-white text-sm">Kéo thả file Excel (.xlsx, .csv) vào đây</h4>
          <p className="text-xs text-slate-400">Hoặc nhấp để chọn tệp từ máy tính của bạn</p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700">
          Tải Mẫu Excel Đơn Hàng Mẫu
        </button>
      </div>
    </div>
  );
};
