import { axiosAdminClient } from './axiosClient';
import type { UserAccount, CreateUserDto, UpdateUserStatusDto } from '../types';

export const userAdminApi = {
  getAllUsers: async (): Promise<UserAccount[]> => {
    const res = await axiosAdminClient.get('/users');
    return res.data;
  },
  createUser: async (dto: CreateUserDto): Promise<UserAccount> => {
    const res = await axiosAdminClient.post('/users', dto);
    return res.data;
  },
  toggleUserStatus: async (dto: UpdateUserStatusDto): Promise<UserAccount> => {
    const res = await axiosAdminClient.patch(`/users/${dto.userId}/status`, dto);
    return res.data;
  },
};
