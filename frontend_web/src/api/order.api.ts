import axiosClient from './axiosClient';
import type {
  QuoteRequestPayload,
  QuoteResponseData,
  CreateOrderPayload,
  Order,
  CancelOrderPayload,
  BulkCancelPayload
} from '../types/order.types';

export interface OrderSearchParams {
  search?: string;
  trackingCode?: string;
  status?: string;
  recipientName?: string;
  recipientPhone?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface PublicTrackingResponse {
  trackingCode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  originCity: string;
  destinationCity: string;
  recipient: {
    fullName: string;
    phone: string;
    addressMasked: string;
  };
  itemsCount: number;
  chargeableWeight: number;
  isCod: boolean;
  timeline: Array<{
    status: string;
    time: string;
    description: string;
  }>;
}

export const orderApi = {
  // Public Guest Tracking by Tracking Code (Masked PII)
  trackOrderPublic: (trackingCode: string) =>
    axiosClient.get<{ success: boolean; message: string; data: PublicTrackingResponse }>(`/orders/track/${trackingCode}`),

  // Private Seller Search & Filter Orders
  searchOrders: (params?: OrderSearchParams) =>
    axiosClient.get<{
      success: boolean;
      message: string;
      data: Order[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>('/orders', { params }),

  getQuote: (payload: QuoteRequestPayload) =>
    axiosClient.post<{ success: boolean; data: QuoteResponseData }>('/orders/quote', payload),

  createOrder: (payload: CreateOrderPayload, idempotencyKey?: string) =>
    axiosClient.post<{
      success: boolean;
      message: string;
      trackingCode: string;
      status: string;
      data: Order;
      printLabelUrl: string;
    }>('/orders', payload, {
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined
    }),

  updateOrder: (id: string, payload: Partial<CreateOrderPayload>) =>
    axiosClient.put<{
      success: boolean;
      message: string;
      fee_changed?: boolean;
      old_fee?: number;
      new_fee?: number;
      order: Order;
    }>(`/orders/${id}`, payload),

  cancelOrder: (id: string, payload: CancelOrderPayload) =>
    axiosClient.delete<{
      success: boolean;
      message: string;
      order: Order;
    }>(`/orders/${id}/cancel`, { data: payload }),

  bulkCancelOrders: (payload: BulkCancelPayload) =>
    axiosClient.post<{
      success: boolean;
      message: string;
      results: {
        successful: Array<{ id: string; trackingCode: string }>;
        failed: Array<{ id: string; trackingCode?: string; reason: string }>;
      };
    }>('/orders/bulk-cancel', payload),

  getPrintLabelUrl: (id: string) => `/orders/${id}/label`,
};
