export const UserRole = {
  ADMIN: 'ADMIN',
  HUB_STAFF: 'HUB_STAFF',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  HUB_COORDINATOR: 'HUB_COORDINATOR',
  SHIPPER: 'SHIPPER', // Shipper giao nhận nội thành
  LOCAL_SHIPPER: 'LOCAL_SHIPPER', // Shipper giao nhận nội thành (alias)
  PICKUP_SHIPPER: 'PICKUP_SHIPPER', // Shipper Gom hàng (First-Mile / Seller -> Hub)
  DELIVERY_SHIPPER: 'DELIVERY_SHIPPER', // Shipper Giao hàng (Last-Mile / Hub -> Khách)
  DRIVER: 'DRIVER', // Tài xế vận chuyển / tương thích ngược
  LINE_HAUL_DRIVER: 'LINE_HAUL_DRIVER', // Tài xế xe tải liên tỉnh
  ORDER_VENDOR_MANAGER: 'ORDER_VENDOR_MANAGER', // Quản lý Duyệt đơn & Nhà cung cấp
  LAST_MILE_DISPATCHER: 'LAST_MILE_DISPATCHER', // Quản lý Điều phối Shipper nội vùng
  LINE_HAUL_DISPATCHER: 'LINE_HAUL_DISPATCHER', // Quản lý Điều phối Đội xe tải
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
  vehicleInfo?: { licensePlate?: string; vehicleType?: string };
  activeGeozoneId?: string;
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

