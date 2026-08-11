import type { Order, UserAccount, AuditLog } from './types';

export const INITIAL_ORDERS: Order[] = [
  {
    _id: 'ORD-1001',
    trackingCode: 'VN-LOG-889421',
    sellerId: 'USR-002',
    pickupAddress: {
      fullName: 'Công ty Dược Phẩm An Bình',
      phone: '0901234567',
      address: '123 Nguyễn Văn Cừ',
      ward: 'Phường 5',
      district: 'Quận 5',
      province: 'TP. Hồ Chí Minh'
    },
    deliveryAddress: {
      fullName: 'Nhà thuốc Trung Sơn',
      phone: '0987654321',
      address: '456 Trần Hưng Đạo',
      ward: 'Phường Ninh Kiều',
      district: 'Ninh Kiều',
      province: 'Cần Thơ'
    },
    items: [
      { _id: 'ITM-01', name: 'Thuốc kháng sinh ColdChain A', quantity: 2, weight: 2.25 }
    ],
    dimensions: { length: 30, width: 25, height: 20 },
    actualWeight: 4.5,
    volumetricWeight: 3.0,
    chargeableWeight: 4.5,
    isCod: true,
    codAmount: 185000,
    goodsValue: 1000000,
    baseFee: 150000,
    insuranceFee: 35000,
    discountAmount: 0,
    shippingFee: 185000,
    pickupHub: 'HUB_SGN_01',
    deliveryHub: 'HUB_VTH_01',
    flagFeeWarning: false,
    flagCodAnomaly: false,
    needsManualRouting: false,
    status: 'IN_TRANSIT',
    createdAt: '2026-08-08 09:30',
    updatedAt: '2026-08-08 09:30'
  },
  {
    _id: 'ORD-1002',
    trackingCode: 'VN-LOG-773102',
    sellerId: 'USR-002',
    pickupAddress: {
      fullName: 'Logistics Kho Vận Hà Nội',
      phone: '0934112233',
      address: 'KCN Sài Đồng',
      ward: 'Sài Đồng',
      district: 'Long Biên',
      province: 'Hà Nội'
    },
    deliveryAddress: {
      fullName: 'Pharmacity Hải Châu',
      phone: '0977889900',
      address: '78 Lê Lợi',
      ward: 'Hải Châu 1',
      district: 'Hải Châu',
      province: 'Đà Nẵng'
    },
    items: [
      { _id: 'ITM-02', name: 'Thiết bị y tế cảm biến', quantity: 1, weight: 12.0 }
    ],
    dimensions: { length: 50, width: 40, height: 30 },
    actualWeight: 12.0,
    volumetricWeight: 12.0,
    chargeableWeight: 12.0,
    isCod: false,
    codAmount: 0,
    goodsValue: 5000000,
    baseFee: 300000,
    insuranceFee: 40000,
    discountAmount: 0,
    shippingFee: 340000,
    pickupHub: 'HUB_HAN_01',
    deliveryHub: 'HUB_DAD_01',
    flagFeeWarning: false,
    flagCodAnomaly: false,
    needsManualRouting: false,
    status: 'OUT_FOR_DELIVERY',
    createdAt: '2026-08-07 14:20',
    updatedAt: '2026-08-07 14:20'
  },
  {
    _id: 'ORD-1003',
    trackingCode: 'VN-LOG-991203',
    sellerId: 'USR-002',
    pickupAddress: {
      fullName: 'Nha Khoa Smile Tech',
      phone: '0908887766',
      address: '24 Lý Thường Kiệt',
      ward: 'Phường 14',
      district: 'Quận 10',
      province: 'TP. Hồ Chí Minh'
    },
    deliveryAddress: {
      fullName: 'Bệnh viện Đa Khoa Bình Dương',
      phone: '0911223344',
      address: 'Đại lộ Bình Dương',
      ward: 'Phú Hòa',
      district: 'Thủ Dầu Một',
      province: 'Bình Dương'
    },
    items: [
      { _id: 'ITM-03', name: 'Vật tư nha khoa đóng thùng', quantity: 4, weight: 0.5 }
    ],
    dimensions: { length: 60, width: 40, height: 40 },
    actualWeight: 2.0,
    volumetricWeight: 19.2,
    chargeableWeight: 19.5,
    isCod: true,
    codAmount: 420000,
    goodsValue: 2000000,
    baseFee: 400000,
    insuranceFee: 20000,
    discountAmount: 0,
    shippingFee: 420000,
    pickupHub: 'HUB_SGN_01',
    deliveryHub: 'HUB_BDG_01',
    flagFeeWarning: false,
    flagCodAnomaly: false,
    needsManualRouting: false,
    status: 'DELIVERED',
    createdAt: '2026-08-06 08:00',
    updatedAt: '2026-08-06 08:00'
  },
  {
    _id: 'ORD-1004',
    trackingCode: 'VN-LOG-554109',
    sellerId: 'USR-002',
    pickupAddress: {
      fullName: 'Công ty Thiết bị Y tế Minh Tâm',
      phone: '0966778899',
      address: '15 Lê Duẩn',
      ward: 'Hải Châu 1',
      district: 'Hải Châu',
      province: 'Đà Nẵng'
    },
    deliveryAddress: {
      fullName: 'Phòng khám đa khoa Quốc tế',
      phone: '0933221100',
      address: '100 Nguyễn Huệ',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      province: 'TP. Hồ Chí Minh'
    },
    items: [
      { _id: 'ITM-04', name: 'Máy đo huyết áp điện tử', quantity: 2, weight: 4.0 }
    ],
    dimensions: { length: 35, width: 35, height: 25 },
    actualWeight: 8.0,
    volumetricWeight: 6.1,
    chargeableWeight: 8.0,
    isCod: false,
    codAmount: 0,
    goodsValue: 1500000,
    baseFee: 160000,
    insuranceFee: 0,
    discountAmount: 0,
    shippingFee: 160000,
    pickupHub: 'HUB_DAD_01',
    deliveryHub: 'HUB_SGN_01',
    flagFeeWarning: false,
    flagCodAnomaly: false,
    needsManualRouting: false,
    status: 'CREATED',
    createdAt: '2026-08-09 10:00',
    updatedAt: '2026-08-09 10:00'
  }
];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'USR-001',
    fullName: 'Nguyễn Văn Quản Lý',
    email: 'admin@elogistic.vn',
    phoneNumber: '0909123456',
    role: 'ADMIN',
    isActive: true,
    failedLoginAttempts: 0,
    createdAt: '2026-01-10',
  },
  {
    id: 'USR-002',
    fullName: 'Công Ty Dược An Bình (Seller)',
    email: 'seller@anbinhpharm.com',
    phoneNumber: '0901234567',
    role: 'SELLER',
    isActive: true,
    failedLoginAttempts: 0,
    createdAt: '2026-03-15',
  },
  {
    id: 'USR-003',
    fullName: 'Nguyễn Văn Hùng (Driver 01)',
    email: 'hung.driver@elogistic.vn',
    phoneNumber: '0912999888',
    role: 'DRIVER',
    isActive: true,
    failedLoginAttempts: 0,
    createdAt: '2026-04-20',
  },
  {
    id: 'USR-004',
    fullName: 'Trần Văn Khóa (Tài khoản bị khóa)',
    email: 'locked.user@gmail.com',
    phoneNumber: '0988777666',
    role: 'SELLER',
    isActive: false,
    failedLoginAttempts: 5,
    lockUntil: '2026-08-09 22:00',
    createdAt: '2026-05-01',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-8801',
    action: 'LOGIN_SUCCESS',
    userId: 'USR-001',
    userEmail: 'admin@elogistic.vn',
    ipAddress: '118.69.182.10',
    timestamp: '2026-08-09 21:15:02',
    note: 'Đăng nhập thành công qua JWT Access Token',
  },
  {
    id: 'LOG-8802',
    action: 'ADMIN_STATUS_CHANGE',
    userId: 'USR-001',
    userEmail: 'admin@elogistic.vn',
    ipAddress: '118.69.182.10',
    timestamp: '2026-08-09 20:30:11',
    note: 'Admin khóa tài khoản USR-004 do sai mật khẩu 5 lần',
  },
  {
    id: 'LOG-8803',
    action: 'ORDER_CREATED',
    userId: 'USR-002',
    userEmail: 'seller@anbinhpharm.com',
    ipAddress: '14.161.42.55',
    timestamp: '2026-08-09 10:00:45',
    note: 'Tạo thành công đơn vận VN-LOG-554109 (Cold Chain)',
  },
  {
    id: 'LOG-8804',
    action: 'PASSWORD_CHANGED',
    userId: 'USR-003',
    userEmail: 'hung.driver@elogistic.vn',
    ipAddress: '27.72.105.88',
    timestamp: '2026-08-08 19:40:00',
    note: 'Đổi mật khẩu thành công qua mã OTP xác thực',
  },
];
