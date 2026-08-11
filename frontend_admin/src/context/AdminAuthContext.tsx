import React, { createContext, useState } from 'react';
import type { AdminUser, AdminRole } from '../types';

interface AdminAuthContextType {
  user: AdminUser | null;
  login: (role?: AdminRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('admin_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default demo admin account
    return {
      id: 'ADM-001',
      email: 'admin@elogistic.vn',
      fullName: 'Nguyễn Văn Quản Lý',
      role: 'ADMIN',
      department: 'Phòng Điều Hành Quốc Gia',
    };
  });

  const login = (role: AdminRole = 'ADMIN') => {
    const mockUser: AdminUser = {
      id: `ADM-${Date.now()}`,
      email: 'admin@elogistic.vn',
      fullName: 'Nguyễn Văn Quản Lý',
      role,
      department: 'Phòng Điều Hành Quốc Gia',
    };
    setUser(mockUser);
    localStorage.setItem('admin_user_profile', JSON.stringify(mockUser));
    localStorage.setItem('admin_access_token', 'mock_admin_jwt_token_889922');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('admin_user_profile');
    localStorage.removeItem('admin_access_token');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};
