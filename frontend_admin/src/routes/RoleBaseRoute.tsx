import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAdminAuth } from '../hooks/useAdminAuth';

interface RoleBaseRouteProps {
  allowedRoles: string[];
}

export const RoleBaseRoute: React.FC<RoleBaseRouteProps> = ({ allowedRoles }) => {
  const { user } = useAdminAuth();

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const userRole = (user.role || '').toString();

  // Allow ADMIN role to access all operations by default
  const isAllowed =
    userRole === 'ADMIN' ||
    allowedRoles.includes(userRole) ||
    (allowedRoles.includes('WAREHOUSE_STAFF') && userRole === 'WAREHOUSE') ||
    (allowedRoles.includes('WAREHOUSE') && userRole === 'WAREHOUSE_STAFF');

  if (!isAllowed) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return <Outlet />;
};

export default RoleBaseRoute;
