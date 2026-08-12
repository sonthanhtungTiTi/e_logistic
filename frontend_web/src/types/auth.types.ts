export type UserRole = 'SELLER' | 'DRIVER' | 'BUYER' | 'ADMIN' | 'STAFF';

export interface AuthUser {
  id?: string;
  _id?: string;
  email: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  companyName?: string;
  avatarUrl?: string;
  taxCode?: string;
  address?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  bankBranch?: string;
  isEmailVerified?: boolean;
  isBankLinked?: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

