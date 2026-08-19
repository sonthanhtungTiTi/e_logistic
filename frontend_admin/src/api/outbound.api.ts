import axiosClient from '@/api/axiosClient';

export interface OutboundScanPayload {
  trip_code: string;
  tripCode?: string;
  tracking_code?: string;
  trackingCode?: string;
  seal_code?: string;
  sealCode?: string;
  client_offline_id?: string | null;
  clientOfflineId?: string | null;
}

export interface OutboundScanResponse {
  success: boolean;
  message: string;
  data: {
    tracking_code: string;
    trackingCode: string;
    trip_code: string;
    tripCode: string;
    trip_status: string;
    tripStatus: string;
    already_scanned: boolean;
    alreadyScanned: boolean;
    message: string;
  };
}

export interface CommitPayload {
  trip_code: string;
  tripCode?: string;
  is_shortage: boolean;
  isShortage?: boolean;
}

export interface CommitResponse {
  success: boolean;
  message: string;
  data: {
    trip_code: string;
    tripCode: string;
    status: string;
    scanned_count: number;
    shortage_count: number;
    shortage_codes: string[];
  };
}

export interface DriverConfirmPayload {
  trip_code?: string;
  action: 'ACCEPT' | 'REJECT';
  reject_reason?: string;
  rejectReason?: string;
}

export interface DriverConfirmResponse {
  success: boolean;
  message: string;
  data: {
    trip_code: string;
    tripCode: string;
    action: string;
    status: string;
    new_order_status?: string;
    reject_reason?: string;
    items_confirmed?: number;
  };
}

export interface CreateTripPayload {
  trip_type?: 'MID_MILE_TRANSFER' | 'LAST_MILE_DELIVERY';
  destination_hub_id?: string;
  planned_tracking_codes: string[];
}

export interface TripListItem {
  _id: string;
  tripCode: string;
  tripType: string;
  status: string;
  plannedTrackingCodes: string[];
  destinationHubId?: { _id: string; code: string; name: string };
  createdAt: string;
}

export const outboundApi = {
  getTrips: (): Promise<{ success: boolean; data: TripListItem[] }> =>
    axiosClient.get('/outbound/trips').then(r => r.data),

  createTrip: (payload: CreateTripPayload): Promise<{ success: boolean; message: string; data: any }> =>
    axiosClient.post('/outbound/trips', payload).then(r => r.data),

  scanOutbound: (payload: OutboundScanPayload): Promise<OutboundScanResponse> =>
    axiosClient.post<OutboundScanResponse>('/outbound/scan', payload).then(r => r.data),

  commitTrip: (payload: CommitPayload): Promise<CommitResponse> =>
    axiosClient.post<CommitResponse>('/outbound/commit', payload).then(r => r.data),

  driverConfirmTrip: (tripCodeOrPayload: string | DriverConfirmPayload, payload?: DriverConfirmPayload): Promise<DriverConfirmResponse> => {
    const finalPayload: DriverConfirmPayload = typeof tripCodeOrPayload === 'string'
      ? { trip_code: tripCodeOrPayload, ...(payload || { action: 'ACCEPT' }) }
      : tripCodeOrPayload;
    return axiosClient.post<DriverConfirmResponse>('/outbound/driver-confirm', finalPayload).then(r => r.data);
  },
};
