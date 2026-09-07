import axiosClient from './axiosClient';
import type { PendingOrder } from './orderManager.api';

export interface DriverInfo {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  vehicleInfo?: {
    vehicleType?: string;
    licensePlate?: string;
  };
  isWorking?: boolean;
  rejectionQuota?: {
    remainingToday: number;
    maxPerDay: number;
  };
  serviceAreas?: Array<{
    province: string;
    district: string;
  }>;
  activeOrdersCount?: number;
}

export interface GetPendingPickupResponse {
  orders: PendingOrder[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AutoAssignAssignment {
  orderId: string;
  trackingCode: string;
  routeType: string;
  pickupAddress?: any;
  deliveryAddress?: any;
  chargeableWeight: number;
  codAmount: number;
  suggestedDriverId: string;
  driverName: string;
  driverPhone: string;
  vehicleInfo?: {
    vehicleType?: string;
    licensePlate?: string;
  };
  score: number;
  reason: string;
}

export interface AutoAssignUnassigned {
  orderId: string;
  trackingCode: string;
  weight?: number;
  pickupAddress?: any;
  reason: string;
}

export interface AutoAssignPreviewResponse {
  success: boolean;
  totalOrders: number;
  assignedCount: number;
  unassignedCount: number;
  assignments: AutoAssignAssignment[];
  unassigned: AutoAssignUnassigned[];
  driversSummary?: Array<{
    driverId: string;
    fullName: string;
    vehicleInfo?: {
      vehicleType?: string;
      licensePlate?: string;
    };
    activeOrdersCount: number;
    newAssignedInBatch: number;
    totalVirtualOrders: number;
  }>;
  message?: string;
}

export interface AutoAssignCommitResponse {
  success: boolean;
  message: string;
  successCount: number;
  failedOrders: Array<{ orderId: string; reason: string }>;
}

export const driverManagerApi = {
  getPendingPickupAssignments: (params?: { province?: string; district?: string; search?: string; page?: number; limit?: number }) =>
    axiosClient.get<GetPendingPickupResponse>('/driver-manager/pending-pickup-assignment', { params }).then(r => r.data),

  getDriversByArea: (params?: { province?: string; district?: string }) =>
    axiosClient.get<{ drivers: DriverInfo[] }>('/driver-manager/drivers-by-area', { params }).then(r => r.data),

  assignPickup: (orderIds: string[], driverId: string) =>
    axiosClient.post<{
      message: string;
      successCount: number;
      assignedOrders: any[];
    }>('/driver-manager/assign-pickup', { orderIds, driverId }).then(r => r.data),

  autoAssignPreview: (payload: { orderIds?: string[]; province?: string; district?: string }) =>
    axiosClient.post<AutoAssignPreviewResponse>('/driver-manager/auto-assign-preview', payload).then(r => r.data),

  autoAssignCommit: (assignments: Array<{ orderId: string; driverId: string }>) =>
    axiosClient.post<AutoAssignCommitResponse>('/driver-manager/auto-assign-commit', { assignments }).then(r => r.data),
};
