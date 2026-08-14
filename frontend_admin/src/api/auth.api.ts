import { axiosAdminClient } from './axiosClient';
import type { AdminLoginCredentials, AdminAuthResponse } from '../types';

export const adminAuthApi = {
  login: async (credentials: AdminLoginCredentials): Promise<AdminAuthResponse> => {
    const res = await axiosAdminClient.post('/auth/login', credentials);
    return res.data;
  },
  logout: async (): Promise<void> => {
    await axiosAdminClient.post('/auth/logout');
  },
  getCurrentUser: async () => {
    const res = await axiosAdminClient.get('/auth/profile');
    return res.data;
  },
};
