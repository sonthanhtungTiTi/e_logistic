import React, { createContext, useState, useEffect } from 'react';
import type { AdminUser } from '../types';
import { adminAuthApi } from '../api/auth.api';

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (userData: AdminUser, token?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('admin_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) {
          return parsed;
        }
      } catch (e) {
        localStorage.removeItem('admin_user_profile');
      }
    }
    return null;
  });

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token');
    if (token) {
      // Validate token with backend protect middleware endpoint (/auth/profile)
      adminAuthApi
        .getCurrentUser()
        .then((profile) => {
          if (profile && profile.role) {
            const verifiedUser: AdminUser = {
              id: profile._id || profile.id || `USR-${Date.now()}`,
              fullName: profile.fullName || 'Người dùng hệ thống',
              email: profile.email,
              role: profile.role,
              department: profile.department || 'Bộ phận vận hành',
            };
            setUser(verifiedUser);
            localStorage.setItem('admin_user_profile', JSON.stringify(verifiedUser));
          }
        })
        .catch(() => {
          // Token is invalid/expired or user account disabled in DB
          setUser(null);
          localStorage.removeItem('admin_user_profile');
          localStorage.removeItem('admin_access_token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const login = (userData: AdminUser, token?: string) => {
    setUser(userData);
    localStorage.setItem('admin_user_profile', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('admin_access_token', token);
    }
  };

  const logout = () => {
    try {
      adminAuthApi.logout().catch(() => {});
    } catch (e) {
      // ignore network errors
    }
    setUser(null);
    localStorage.removeItem('admin_user_profile');
    localStorage.removeItem('admin_access_token');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};



