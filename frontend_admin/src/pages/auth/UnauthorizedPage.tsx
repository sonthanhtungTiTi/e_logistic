import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { UserRole } from '../../types';

export const UnauthorizedPage: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleReturn = () => {
    if (!user) {
      navigate('/admin/login');
      return;
    }
    const role = user.role;
    if (role === UserRole.DRIVER || role === UserRole.LINE_HAUL_DRIVER) {
      navigate('/driver/pickup');
    } else if (role === UserRole.WAREHOUSE_STAFF || role === UserRole.HUB_STAFF) {
      navigate('/warehouse/inbound');
    } else if (role === UserRole.SELLER) {
      window.location.href = 'http://localhost:5173/seller/dashboard';
    } else {
      navigate('/admin/dashboard');
    }
  };

  const handleSwitchAccount = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md glass-panel p-8 rounded-3xl border border-rose-500/30 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-white">Truy Cập Bị Tạm Chặn (403 Forbidden)</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Tài khoản vai trò <span className="font-bold text-rose-300 font-mono">[{user?.role || 'UNAUTHENTICATED'}]</span> không có thẩm quyền truy cập vào trang Quản Trị Hệ Thống.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            onClick={handleReturn}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay Về Kênh Seller
          </button>
          <button
            onClick={handleSwitchAccount}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-rose-600/30"
          >
            <LogOut className="w-4 h-4" /> Đăng Nhập Admin Khác
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
