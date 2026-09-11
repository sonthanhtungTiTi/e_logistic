import axiosClient from './axiosClient';

export interface TicketMessage {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

export interface TicketItem {
  _id: string;
  ticketCode: string;
  sellerId: {
    _id: string;
    fullName?: string;
    companyName?: string;
    email?: string;
    phoneNumber?: string;
  } | string;
  trackingCode?: string;
  category: 'DELIVERY_DELAY' | 'DAMAGED_GOODS' | 'LOST_GOODS' | 'COD_DISPUTE' | 'ADDRESS_CHANGE' | 'OTHER';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_SELLER' | 'RESOLVED' | 'CLOSED';
  subject: string;
  messages: TicketMessage[];
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

export const ticketApi = {
  getTickets: (params?: { status?: string; category?: string; search?: string; page?: number; limit?: number }) =>
    axiosClient.get<{ success: boolean; count: number; total: number; data: TicketItem[] }>('/tickets', { params }),

  getTicketDetails: (id: string) =>
    axiosClient.get<{ success: boolean; data: TicketItem }>(`/tickets/${id}`),

  createTicket: (data: {
    trackingCode?: string;
    category: string;
    priority?: string;
    subject: string;
    content: string;
  }) =>
    axiosClient.post<{ success: boolean; message: string; data: TicketItem }>('/tickets', data),

  sendMessage: (id: string, message: string) =>
    axiosClient.post<{ success: boolean; message: string; data: TicketItem }>(`/tickets/${id}/messages`, { message }),
};
