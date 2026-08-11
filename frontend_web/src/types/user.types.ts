import type { UserRole } from './auth.types';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  avatarUrl?: string;
  companyName?: string;
  address?: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  timestamp: string;
  note: string;
}
