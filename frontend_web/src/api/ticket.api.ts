import axiosClient from './axiosClient';

export const ticketApi = {
  getTickets: () => axiosClient.get('/tickets'),
  createTicket: (data: Record<string, unknown>) => axiosClient.post('/tickets', data),
};
