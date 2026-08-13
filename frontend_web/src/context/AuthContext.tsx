import React, { createContext, useState, useEffect } from 'react';
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
    } else if (!token) {
      localStorage.removeItem('token');
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

