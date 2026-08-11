import { axiosAdminClient } from './axiosClient';
import type { AuditLog, AuditFilter } from '../types';

export const auditApi = {
  getAuditLogs: async (filters?: AuditFilter): Promise<AuditLog[]> => {
    const res = await axiosAdminClient.get('/audit-logs', { params: filters });
    return res.data;
  },
};
