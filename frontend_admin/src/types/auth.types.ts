export type AdminRole = 'ADMIN' | 'OPERATIONS' | 'DISPATCHER' | 'SUPPORT' | 'WAREHOUSE' | 'FINANCE';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  department: string;
  avatarUrl?: string;
}

export interface AdminLoginCredentials {
  email: string;
  passwordHash: string;
}

export interface AdminAuthResponse {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
}
