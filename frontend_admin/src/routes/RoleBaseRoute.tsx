import React from 'react';
import { Navigate } from 'react-router';
import { useAdminAuth } from '../hooks/useAdminAuth';
import type { AdminRole } from '../types';

interface RoleBaseRouteProps {
  children: React.ReactNode;
  allowedRoles: AdminRole[];
}

export const RoleBaseRoute: React.FC<RoleBaseRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAdminAuth();

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return <>{children}</>;
};
