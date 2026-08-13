import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();

  if (!user || !token || token === 'mock-jwt-token-seller') {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
};
