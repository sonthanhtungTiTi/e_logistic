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
    <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo User Email, IP Address, hoặc Nội dung Log..."
          className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs font-mono"
        />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={selectedAction}
          onChange={(e) => onActionChange(e.target.value)}
          className="glass-input rounded-xl px-3 py-2 text-xs"
        >
          <option value="ALL" className="bg-slate-900">Tất Cả Loại Thao Tác</option>
          <option value="LOGIN_SUCCESS" className="bg-slate-900">Đăng Nhập Thành Công</option>
          <option value="ADMIN_STATUS_CHANGE" className="bg-slate-900">Thay Đổi Trạng Thái Khóa</option>
          <option value="ORDER_CREATED" className="bg-slate-900">Khởi Tạo Đơn Hàng</option>
          <option value="PASSWORD_CHANGED" className="bg-slate-900">Đổi Mật Khẩu</option>
        </select>
      </div>
    </div>
  );
};
