import { axiosAdminClient } from './axiosClient';
import type { UserAccount, CreateUserDto } from '../types';

export const userAdminApi = {
  getAllUsers: async (): Promise<UserAccount[]> => {
    const res = await axiosAdminClient.get('/admin/users');
    const userList = res.data?.users || res.data || [];
    return userList.map((u: any) => ({
      id: u._id || u.id,
      fullName: u.fullName || 'N/A',
      email: u.email || '',
      phoneNumber: u.phoneNumber || '',
      role: u.role,
      isActive: u.isActive !== undefined ? u.isActive : true,
      failedLoginAttempts: u.failedLoginAttempts || 0,
      createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo',
    }));
  },
  createUser: async (dto: CreateUserDto): Promise<any> => {
    const res = await axiosAdminClient.post('/admin/users', dto);
    return res.data;
  },
  toggleUserStatus: async (userId: string, action: 'lock' | 'unlock' | 'deactivate'): Promise<any> => {
    const res = await axiosAdminClient.patch(`/admin/users/${userId}/status`, { action });
    return res.data;
  },
};

