import axiosClient from './axiosClient';

export interface PendingOrder {
  _id: string;
  trackingCode: string;
  status: string;
  sellerPreparedAt?: string;
  createdAt: string;
  pickupAddress: {
    fullName: string;
    phone: string;
    address: string;
    ward?: string;
    district: string;
    province: string;
  };
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    ward?: string;
    district: string;
    province: string;
  };
  sellerId?: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    companyName?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    weight: number;
  }>;
  chargeableWeight?: number;
  codAmount?: number;
  shippingFee?: number;
  routeType?: string;
}

export interface GetPendingApprovalResponse {
  orders: PendingOrder[];
  groupedByRegion?: Record<string, PendingOrder[]>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const orderManagerApi = {
  getPendingApproval: (params?: { province?: string; district?: string; search?: string; page?: number; limit?: number }) =>
    axiosClient.get<GetPendingApprovalResponse>('/order-manager/pending-approval', { params }).then(r => r.data),

  bulkApprove: (orderIds: string[]) =>
    axiosClient.post<{
      message: string;
      approvedCount: number;
      approvedOrders: any[];
    }>('/order-manager/bulk-approve', { orderIds }).then(r => r.data),

  getApprovedOrders: (params?: { search?: string; province?: string; page?: number; limit?: number }) =>
    axiosClient.get<{
      data?: PendingOrder[];
      orders?: PendingOrder[];
      pagination?: any;
    }>('/orders?status=APPROVED,ASSIGNED_TO_PICKUP,ASSIGNED_TO_PICKUP_AND_DELIVERY', { params }).then(r => r.data),
};
