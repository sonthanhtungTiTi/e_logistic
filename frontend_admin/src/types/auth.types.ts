export const UserRole = {
  ADMIN: 'ADMIN',
  HUB_STAFF: 'HUB_STAFF',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  HUB_COORDINATOR: 'HUB_COORDINATOR',
  DRIVER: 'DRIVER',
  LINE_HAUL_DRIVER: 'LINE_HAUL_DRIVER',
  ACCOUNTANT: 'ACCOUNTANT',
  CS: 'CS',
  CUSTOMER_SERVICE: 'CUSTOMER_SERVICE',
  SELLER: 'SELLER',
  BUYER: 'BUYER',
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
  role: UserRole | string;
}

export interface AdminLoginCredentials {
  identifier: string;
  password: string;
}

export interface AdminAuthResponse {
  _id?: string;
  id?: string;
  fullName: string;
  email: string;
  role: UserRole | string;
  accessToken: string;
  refreshToken: string;
  department?: string;
  user?: AdminUser;
}

