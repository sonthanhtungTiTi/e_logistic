import axiosClient from '@/api/axiosClient';
import type { PickupConfirmRequest, PickupConfirmResponse } from '@/types/logistics.types';

export const driverApi = {
  confirmPickup: async (payload: PickupConfirmRequest): Promise<PickupConfirmResponse> => {
    const code = payload.tracking_code || payload.trackingCode || '';
    const lat = payload.latitude ?? (payload as any).gpsLat;
    const lng = payload.longitude ?? (payload as any).gpsLng;

    // Mapping đồng thời cả camelCase & snake_case (latitude/longitude & gpsLat/gpsLng)
    // đảm bảo khớp 100% với Data Contract Backend dù endpoint đọc định dạng nào.
    const requestBody = {
      tracking_code: code,
      trackingCode: code,
      latitude: lat,
      longitude: lng,
      gpsLat: lat,
      gpsLng: lng,
      note: payload.note
    };

    try {
      const res = await axiosClient.post<PickupConfirmResponse>('/api/v1/driver/pickup-confirm', requestBody);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const res = await axiosClient.post<PickupConfirmResponse>('/api/orders/shipper/process-scan', requestBody);
        return res.data;
      }
      throw err;
    }
  }
};
