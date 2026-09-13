import { axiosClient } from './axiosClient';

export interface AdminTicketMessage {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

export interface AdminTicketItem {
  _id: string;
  ticketCode: string;
  sellerId?: {
    _id: string;
    fullName?: string;
    companyName?: string;
    email?: string;
    phoneNumber?: string;
  };
  trackingCode?: string;
  category: 'DELIVERY_DELAY' | 'DAMAGED_GOODS' | 'LOST_GOODS' | 'COD_DISPUTE' | 'ADDRESS_CHANGE' | 'OTHER';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_SELLER' | 'RESOLVED' | 'CLOSED';
  subject: string;
  messages: AdminTicketMessage[];
  assignedTo?: {
    _id: string;
    fullName: string;
    email: string;
  };
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const ticketAdminApi = {
  listTickets: (params?: {
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    axiosClient.get<{
      success: boolean;
      count: number;
      total: number;
      statusCounts: {
        OPEN: number;
        IN_PROGRESS: number;
        WAITING_SELLER: number;
        RESOLVED: number;
        CLOSED: number;
      };
      data: AdminTicketItem[];
    }>('/tickets/admin/list', { params }),

  getTicketDetails: (id: string) =>
    axiosClient.get<{ success: boolean; data: AdminTicketItem }>(`/tickets/${id}`),

  sendMessage: (id: string, message: string) =>
    axiosClient.post<{ success: boolean; message: string; data: AdminTicketItem }>(`/tickets/${id}/messages`, {
      message,
    }),

  updateTicket: (
    id: string,
    payload: {
      status?: string;
      priority?: string;
      assignedTo?: string | null;
      resolutionNote?: string;
    }
  ) =>
    axiosClient.put<{ success: boolean; message: string; data: AdminTicketItem }>(`/tickets/admin/${id}`, payload),
};
