import axiosClient from '@/api/axiosClient';
import type { InboundScanRequest, InboundScanResponse } from '@/types/logistics.types';

export const warehouseApi = {
  scanInbound: async (payload: InboundScanRequest): Promise<InboundScanResponse> => {
    try {
      const res = await axiosClient.post<InboundScanResponse>('/api/inbound/scan-single', payload);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const res = await axiosClient.post<InboundScanResponse>('/api/orders/warehouse/inbound', {
          tracking_code: payload.tracking_code || payload.trackingCode,
          package_condition: payload.package_condition
        });
        return res.data;
      }
      throw err;
    }
  }
};
