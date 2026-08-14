import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAdminAuth } from '../hooks/useAdminAuth';

interface RoleBaseRouteProps {
  allowedRoles: string[];
}

export const RoleBaseRoute: React.FC<RoleBaseRouteProps> = ({ allowedRoles }) => {
  const { user } = useAdminAuth();

  // 1. Kiểm tra trạng thái đăng nhập
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const userRole = (user.role || '').toString();

  // 2. Kiểm tra thẩm quyền (Quyền ADMIN mặc định truy cập toàn quyền)
  const isAllowed = userRole === 'ADMIN' || allowedRoles.includes(userRole);

  // 3. Nếu không có quyền -> Redirect về trang unauthorized
  if (!isAllowed) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return <Outlet />;
};

export default RoleBaseRoute;
