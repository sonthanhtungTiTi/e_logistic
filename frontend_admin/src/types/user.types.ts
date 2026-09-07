import type { AdminRole } from './auth.types';

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'SELLER' | 'DRIVER' | 'LINE_HAUL_DRIVER' | 'SHIPPER' | 'LOCAL_SHIPPER' | 'HUB_STAFF' | 'HUB_COORDINATOR' | 'STAFF' | AdminRole;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil?: string;
  lastLogin?: string;
  createdAt?: string;
  hubId?: any;
  vehicleInfo?: {
    licensePlate?: string;
    vehicleType?: string;
  };
  operatingArea?: {
    province?: string;
    district?: string;
    ward?: string;
    subZone?: string;
    detailAddress?: string;
  };
}

export interface CreateUserDto {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  hubId?: string;
  vehicleInfo?: {
    licensePlate?: string;
    vehicleType?: string;
  };
  operatingArea?: {
    province?: string;
    district?: string;
    ward?: string;
    subZone?: string;
    detailAddress?: string;
  };
}

export interface UpdateUserStatusDto {
  userId: string;
  isActive: boolean;
  reason?: string;
}
