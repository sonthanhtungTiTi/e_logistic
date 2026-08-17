import React, { createContext, useState } from 'react';
import type { AdminUser, AdminRole } from '../types';
import axiosClient from '../api/axiosClient';

interface AdminAuthContextType {
  user: AdminUser | null;
  login: (role?: AdminRole) => void;
  loginWithCredentials: (identifier: string, password: string) => Promise<AdminUser>;
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
    // Không còn default hardcode — phải đăng nhập thật
    return null;
  });

  /**
   * loginWithCredentials — Gọi API backend thật.
   * Lưu JWT thật vào localStorage để axiosClient tự đính vào mọi request.
   */
  const loginWithCredentials = async (identifier: string, password: string): Promise<AdminUser> => {
    // Xóa token cũ trước khi đăng nhập mới
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('admin_user_profile');

    const res = await axiosClient.post('/auth/login', { identifier, password });
    const data = res.data;

    // Backend trả về flat object: { _id, fullName, email, role, hubId, accessToken, refreshToken }
    const accessToken: string = data.accessToken;
    const profile: AdminUser = {
      id:       data._id || data.id || '',
      fullName: data.fullName || data.full_name || identifier,
      email:    data.email || identifier,
      role:     data.role || 'HUB_STAFF',
      hubId:    data.hubId || data.hub_id || undefined,
    };

    // Lưu token JWT thật — axiosClient interceptor sẽ tự dùng
    localStorage.setItem('admin_access_token', accessToken);
    localStorage.setItem('admin_user_profile', JSON.stringify(profile));

    setUser(profile);
    return profile;
  };

  /**
   * login — Giữ lại để tương thích các chỗ đang dùng (legacy mock),
   * nhưng KHÔNG được dùng ở trang login nữa.
   * @deprecated Dùng loginWithCredentials() thay thế
   */
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
    localStorage.removeItem('access_token');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
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
