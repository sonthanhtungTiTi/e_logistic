import axiosClient from './axiosClient';
import type { Order, AdminApprovePayload } from '../types/order.types';

export const adminOrderApi = {
  getGlobalOrders: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    riskFlag?: string;
    hub?: string;
  }) =>
    axiosClient.get<{
      success: boolean;
      data: Order[];
      pagination?: { total: number; page: number; limit: number; totalPages: number };
    }>('/orders', { params }),

  getOrderById: (id: string) =>
    axiosClient.get<{ success: boolean; data: Order }>(`/orders/${id}`),

  approveOrder: (id: string, payload: AdminApprovePayload) =>
    axiosClient.post<{ success: boolean; message: string; data: Order }>(`/orders/${id}/approve`, payload),

  cancelOrder: (id: string, payload: { reason: string; customReason?: string }) =>
    axiosClient.delete<{ success: boolean; message: string; order: Order }>(`/orders/${id}/cancel`, { data: payload }),

  updateOrder: (id: string, payload: Partial<Order>) =>
    axiosClient.put<{ success: boolean; message: string; order: Order }>(`/orders/${id}`, payload),
};
