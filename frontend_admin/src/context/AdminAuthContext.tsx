import React, { createContext, useState, useEffect } from 'react';
import type { AdminUser } from '../types';
import { adminAuthApi } from '../api/auth.api';
import axiosClient from '../api/axiosClient';

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (userData: AdminUser, token?: string) => void;
  loginWithCredentials: (identifier: string, password: string) => Promise<AdminUser>;
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
    const token = localStorage.getItem('admin_access_token') || localStorage.getItem('access_token');
    if (token) {
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
              hubId: profile.hubId || profile.hub_id,
            };
            setUser(verifiedUser);
            localStorage.setItem('admin_user_profile', JSON.stringify(verifiedUser));
          }
        })
        .catch(() => {
          setUser(null);
          localStorage.removeItem('admin_user_profile');
          localStorage.removeItem('admin_access_token');
          localStorage.removeItem('access_token');
        })
        .finally(() => {
          setLoading(false);
        });
  } else {
    setUser(null);
    setLoading(false);
  }
  }, []);

  /**
   * loginWithCredentials — Gọi API backend thật.
   * Lưu JWT thật vào localStorage để axiosClient tự đính vào mọi request.
   */
  const loginWithCredentials = async (identifier: string, password: string): Promise<AdminUser> => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('admin_user_profile');

    const res = await axiosClient.post('/auth/login', { identifier, password });
    const data = res.data;

    const accessToken: string = data.accessToken || data.token;
    const profile: AdminUser = {
      id: data._id || data.id || '',
      fullName: data.fullName || data.full_name || identifier,
      email: data.email || identifier,
      role: data.role || 'HUB_STAFF',
      hubId: data.hubId || data.hub_id || undefined,
      department: data.department || 'Bộ phận vận hành',
    };

    localStorage.setItem('admin_access_token', accessToken);
    localStorage.setItem('admin_user_profile', JSON.stringify(profile));

    setUser(profile);
    return profile;
  };

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
      // ignore
    }
    setUser(null);
    localStorage.removeItem('admin_user_profile');
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('access_token');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithCredentials,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export default AdminAuthProvider;
