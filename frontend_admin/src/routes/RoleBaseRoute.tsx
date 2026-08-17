import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAdminAuth } from '../hooks/useAdminAuth';

interface RoleBaseRouteProps {
  allowedRoles: string[];
}

export const RoleBaseRoute: React.FC<RoleBaseRouteProps> = ({ allowedRoles }) => {
  const { user, loading } = useAdminAuth();

  // 0. Nếu đang xác thực JWT với Backend middleware -> Hiển thị màn hình chờ
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-mono">Đang xác thực JWT Token...</span>
        </div>
      </div>
    );
  }

  // 1. Kiểm tra trạng thái đăng nhập
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const userRole = (user.role || '').toString();

  // 2. Kiểm tra thẩm quyền:
  // Admin mặc định có quyền trên các route quản trị
  const isAllowed = allowedRoles.includes(userRole) || userRole === 'ADMIN';

  // 3. Nếu không có quyền -> Redirect về trang phù hợp với vai trò
  if (!isAllowed) {
    if (userRole === 'DRIVER' || userRole === 'LINE_HAUL_DRIVER') {
      return <Navigate to="/driver/pickup" replace />;
    }
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return <Outlet />;
};

export default RoleBaseRoute;


