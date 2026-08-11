import { axiosAdminClient } from './axiosClient';

export const reportApi = {
  getSlaMetrics: async () => {
    const res = await axiosAdminClient.get('/reports/sla');
    return res.data;
  },
};
