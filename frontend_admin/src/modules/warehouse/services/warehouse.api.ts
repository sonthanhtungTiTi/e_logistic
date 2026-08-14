import axiosClient from '../../../api/axiosClient';
import type { InboundScanRequest, InboundScanResponse } from '../../../types/logistics.types';

export const warehouseApi = {
  scanInbound: async (payload: InboundScanRequest): Promise<InboundScanResponse> => {
    try {
      const res = await axiosClient.post<InboundScanResponse>('/api/inbound/scan-single', payload);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const res = await axiosClient.post<InboundScanResponse>('/api/v1/warehouse/inbound/single', payload);
        return res.data;
      }
      throw err;
    }
  }
};
