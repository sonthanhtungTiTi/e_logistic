export const UserRole = {
  ADMIN: 'ADMIN',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  WAREHOUSE: 'WAREHOUSE',
  DRIVER: 'DRIVER',
  HUB_DISPATCHER: 'HUB_DISPATCHER',
  REGIONAL_DISPATCHER: 'REGIONAL_DISPATCHER',
  ACCOUNTANT: 'ACCOUNTANT',
  CUSTOMER_SERVICE: 'CUSTOMER_SERVICE',
  OPERATIONS: 'OPERATIONS',
  DISPATCHER: 'DISPATCHER'
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export type AdminRole = UserRole | 'SUPPORT' | 'FINANCE';

export interface AuthUser {
  _id?: string;
  id?: string;
  full_name?: string;
  fullName?: string;
  phone_number?: string;
  phoneNumber?: string;
  email?: string;
  role: UserRole | string;
  department?: string;
  hub_id?: string;
  hubId?: string;
  hub_name?: string;
  avatarUrl?: string;
}

export interface AdminUser extends AuthUser {
  id: string;
  fullName: string;
  role: UserRole | any;
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
