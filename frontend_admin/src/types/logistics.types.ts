// Payload UC12 - Xác nhận lấy hàng (Shipper Pickup)
export interface PickupConfirmRequest {
  tracking_code?: string;
  trackingCode?: string;
  latitude?: number;
  longitude?: number;
  gpsLat?: number;
  gpsLng?: number;
  signatureImageUrl?: string;
  parcelImageUrl?: string;
  parcelPhoto?: string;
  actualWeight?: number;
  note?: string;
  signatureImageUrl?: string;
  parcelImageUrl?: string;
  actualWeight?: number;
}

export interface PickupConfirmResponse {
  success: boolean;
  message: string;
  order?: any;
  data: {
    tracking_code: string;
    trackingCode?: string;
    status: 'PICKED_UP' | string;
    picked_at: string;
    seller_name?: string;
    destination_hub_name?: string;
    order?: any;
  };
}

// Payload UC16 - Quét nhập kho (Inbound Scan)
export interface InboundScanRequest {
  tracking_code: string;
  trackingCode?: string;
  package_condition: 'INTACT' | 'DAMAGED' | 'TORN_SEAL';
  condition?: 'INTACT' | 'DAMAGED' | 'TORN_SEAL';
  note?: string;
  // UC-16 Module 4: Đo lại cân nặng tại kho (gram), optional
  hub_measured_weight?: number | null;
  hubMeasuredWeight?: number | null;
  // Idempotency key cho offline queue
  client_offline_id?: string | null;
  clientOfflineId?: string | null;
}

export interface InboundScanResponse {
  success: boolean;
  message: string;
  data: {
    tracking_code: string;
    trackingCode?: string;
    previous_status: string;
    current_status: 'IN_HUB_ORIGIN' | 'IN_SORTING_HUB' | 'IN_HUB_DEST' | 'EXCEPTION_INBOUND' | string;
    next_action: 'SORT_FOR_TRANSIT' | 'SORT_FOR_NEXT_HUB' | 'WAITING_FOR_DELIVERY' | 'WAITING_SELLER_RETURN' | 'EXCEPTION_AREA' | 'HOLD' | string;
    is_flagged: boolean;
    hub_id: string;
    // UC-16 Module 4: fields mới
    weight_discrepancy_gram?: number | null;
    weightDiscrepancyGram?: number | null;
    needs_manual_routing?: boolean;
    needsManualRouting?: boolean;
    zone_id?: string | null;
    zoneId?: string | null;
    timestamp?: string;
  };
}

// UC-16 Module 4: Quét nhập kho theo Seal bao tải
export interface SealScanPayload {
  seal_code?: string;
  sealCode?: string;
  client_offline_id?: string | null;
  clientOfflineId?: string | null;
}

export interface SealScanResponse {
  success: boolean;
  message: string;
  data: {
    seal_code: string;
    total: number;
    success_count: number;
    failed_count: number;
    bag_status: string;
    success_items: InboundScanResponse['data'][];
    failed_items: Array<{ tracking_code: string; reason: string; code: string }>;
  };
}

// UC-16 Module 4: Báo cáo sự cố / ngoại lệ kiện hàng
export interface IncidentPayload {
  tracking_code?: string;
  trackingCode?: string;
  photo_urls?: string[];
  photoUrls?: string[];
  note?: string;
}

export interface IncidentResponse {
  success: boolean;
  message: string;
  data: {
    tracking_code: string;
    trackingCode: string;
    previous_status: string;
    current_status: 'EXCEPTION_INBOUND';
    is_flagged: true;
    photos_received: number;
  };
}

