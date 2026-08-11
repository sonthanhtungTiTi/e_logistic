import type { AdminRole } from './auth.types';

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'SELLER' | 'DRIVER' | 'STAFF' | AdminRole;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface CreateUserDto {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
}

export interface UpdateUserStatusDto {
  userId: string;
  isActive: boolean;
  reason?: string;
}
