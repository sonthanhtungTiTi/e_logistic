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

export const outboundApi = {
  scanOutbound: (payload: OutboundScanPayload): Promise<OutboundScanResponse> =>
    axiosClient.post<OutboundScanResponse>('/outbound/scan', payload).then(r => r.data),

  commitTrip: (payload: CommitPayload): Promise<CommitResponse> =>
    axiosClient.post<CommitResponse>('/outbound/commit', payload).then(r => r.data),

  driverConfirmTrip: (tripCode: string, payload: DriverConfirmPayload): Promise<DriverConfirmResponse> =>
    axiosClient.post<DriverConfirmResponse>(`/driver/trips/${tripCode}/confirm`, payload).then(r => r.data),
};
