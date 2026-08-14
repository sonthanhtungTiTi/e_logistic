import axiosClient from '../../../api/axiosClient';
import type { PickupConfirmRequest, PickupConfirmResponse } from '../../../types/logistics.types';

export const driverApi = {
  confirmPickup: async (payload: PickupConfirmRequest): Promise<PickupConfirmResponse> => {
    try {
      const res = await axiosClient.post<PickupConfirmResponse>('/api/v1/driver/pickup-confirm', payload);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const res = await axiosClient.post<PickupConfirmResponse>('/api/orders/shipper/process-scan', {
          tracking_code: payload.tracking_code || payload.trackingCode,
          latitude: payload.latitude,
          longitude: payload.longitude,
          note: payload.note
        });
        return res.data;
      }
      throw err;
    }
  }
};
