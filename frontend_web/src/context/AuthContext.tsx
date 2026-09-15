import React, { createContext, useState, useEffect } from 'react';
import { io as socketIO } from 'socket.io-client';
import axiosClient from '../api/axiosClient';
import type { AuthUser, UserRole } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<AuthUser>) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  token: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('token');
    if (!saved || saved === 'undefined' || saved === 'null' || saved.trim() === '') {
      localStorage.removeItem('token');
      return null;
    }
    return saved;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('user');
    if (!saved || saved === 'undefined' || saved === 'null') {
      localStorage.removeItem('user');
      return null;
    }
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const login = (newToken: string, newUser: AuthUser) => {
    if (!newToken || newToken === 'undefined' || newToken === 'null') return;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = (updatedFields: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (token && token !== 'undefined' && token !== 'null') {
      localStorage.setItem('token', token);
      // Skip remote API check for mock tokens to prevent 401 logout on refresh
      if (token === 'mock-jwt-token-seller') {
        return;
      }
      // Kiểm tra tính hiệu lực của Token với Backend và đồng bộ thông tin tài khoản
      axiosClient
        .get('/auth/profile')
        .then((res) => {
          if (res.data) {
            const p = res.data;
            const updatePayload: Partial<AuthUser> = {
              fullName: p.fullName,
              phoneNumber: p.phoneNumber,
              address: p.address,
              companyName: p.companyName,
            };
            if (p.kycStatus !== undefined) updatePayload.kycStatus = p.kycStatus;
            if (p.kycVerified !== undefined) updatePayload.kycVerified = p.kycVerified;
            updateUser(updatePayload);
          }
        })
        .catch((err) => {
          if (err.response?.status === 401 && (err.response?.data?.message?.includes('token') || err.response?.data?.message?.includes('hết hạn'))) {
            console.warn('⚠️ Phiên làm việc đã hết hạn. Đang đăng xuất...');
            logout();
          }
        });
    } else if (!token) {
      localStorage.removeItem('token');
    }
  }, [token]);

  // Realtime Socket listener cho KYC status update từ Admin/Server
  useEffect(() => {
    if (!user) return;
    const userId = user._id || (user as any).id;
    if (!userId) return;

    const socket = socketIO('http://localhost:5000', { transports: ['websocket'] });
    socket.emit('join_seller_room', userId);

    socket.on('kyc:status_updated', (data: any) => {
      console.log('⚡ [AuthContext] Realtime KYC status updated event:', data);
      const isApproved = data?.status === 'APPROVED' || data?.type === 'APPROVED' || data?.kycVerified === true;
      const newStatus = data?.status || (isApproved ? 'APPROVED' : 'REJECTED');
      updateUser({
        kycStatus: newStatus,
        kycVerified: isApproved,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id || (user as any)?.id]);

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

