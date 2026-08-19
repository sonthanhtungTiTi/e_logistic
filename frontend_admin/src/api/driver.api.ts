import axiosClient from '@/api/axiosClient';
import type { PickupConfirmRequest, PickupConfirmResponse } from '@/types/logistics.types';

export const driverApi = {
  confirmPickup: async (payload: PickupConfirmRequest): Promise<PickupConfirmResponse> => {
    const code = payload.tracking_code || payload.trackingCode || '';
    const lat = payload.latitude ?? (payload as any).gpsLat;
    const lng = payload.longitude ?? (payload as any).gpsLng;

    const requestBody = {
      trackingCode: code,
      signatureImageUrl: payload.signatureImageUrl || 'https://cdn.e-logistic.vn/signatures/sig_pwa_default.png',
      parcelImageUrl: (payload as any).parcelImageUrl || (payload as any).parcelPhoto || 'https://cdn.e-logistic.vn/proofs/parcel_default.png',
      gpsLat: lat,
      gpsLng: lng,
      actualWeight: payload.actualWeight,
      note: payload.note
    };

    try {
      const res = await axiosClient.post<PickupConfirmResponse>(`/orders/shipper/${code}/confirm-pickup`, requestBody);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        try {
          const res = await axiosClient.post<PickupConfirmResponse>('/v1/driver/pickup-confirm', requestBody);
          return res.data;
        } catch (e2: any) {
          if (e2.response?.status === 404) {
            const res = await axiosClient.post<PickupConfirmResponse>('/orders/shipper/process-scan', requestBody);
            return res.data;
          }
          throw e2;
        }
      }
      throw err;
    }
  },

  verifyPickupScan: async (trackingCode: string): Promise<any> => {
    const res = await axiosClient.post(`/orders/shipper/${trackingCode}/verify-scan`, { trackingCode });
    return res.data;
  },

  getPickedUpOrders: async (): Promise<any[]> => {
    try {
      const res = await axiosClient.get('/orders?status=PICKED_UP&limit=100');
      const list = res.data?.data || res.data?.orders || (Array.isArray(res.data) ? res.data : []);
      return list;
    } catch (err) {
      console.warn('Failed to fetch driver picked up orders:', err);
      return [];
    }
  },

  getPendingPickupOrders: async (): Promise<any[]> => {
    try {
      const res = await axiosClient.get('/orders?status=READY_TO_PICK&limit=100');
      const list = res.data?.data || res.data?.orders || (Array.isArray(res.data) ? res.data : []);
      return list;
    } catch (err) {
      console.warn('Failed to fetch pending pickup orders:', err);
      return [];
    }
  }
};
