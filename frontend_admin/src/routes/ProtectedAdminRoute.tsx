import React from 'react';
import { Navigate } from 'react-router';
import { useAdminAuth } from '../hooks/useAdminAuth';

export const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAdminAuth();

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
