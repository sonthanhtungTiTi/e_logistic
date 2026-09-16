import React from 'react';
import { Filter, Search } from 'lucide-react';

interface AuditFilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedAction: string;
  onActionChange: (val: string) => void;
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedAction,
  onActionChange,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo User Email, IP Address, hoặc Nội dung Log..."
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={selectedAction}
          onChange={(e) => onActionChange(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">Tất Cả Loại Thao Tác</option>
          <option value="LOGIN_SUCCESS">Đăng Nhập Thành Công</option>
          <option value="ADMIN_STATUS_CHANGE">Thay Đổi Trạng Thái Khóa</option>
          <option value="ORDER_CREATED">Khởi Tạo Đơn Hàng</option>
          <option value="PASSWORD_CHANGED">Đổi Mật Khẩu</option>
        </select>
      </div>
    </div>
  );
};

