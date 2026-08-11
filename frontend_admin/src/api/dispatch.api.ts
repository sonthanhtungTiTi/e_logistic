import { axiosAdminClient } from './axiosClient';
import type { Order, DispatchAssignPayload } from '../types';

export const dispatchApi = {
  getAllOrders: async (): Promise<Order[]> => {
    const res = await axiosAdminClient.get('/orders');
    return res.data;
  },
  assignDriver: async (payload: DispatchAssignPayload): Promise<Order> => {
    const res = await axiosAdminClient.post('/dispatch/assign', payload);
    return res.data;
  },
  updateOrderStatus: async (orderId: string, status: string, location?: string): Promise<Order> => {
    const res = await axiosAdminClient.patch(`/orders/${orderId}/status`, { status, location });
    return res.data;
  },
};
