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
}

export interface PickupConfirmResponse {
  success: boolean;
  message: string;
  order?: any;
  data: {
    tracking_code: string;
    trackingCode?: string;
    status: 'PICKED_UP';
    picked_at: string;
    seller_name?: string;
    destination_hub_name?: string;
  };
}

// Payload UC16 - Quét nhập kho (Inbound Scan)
export interface InboundScanRequest {
  tracking_code: string;
  trackingCode?: string;
  package_condition: 'INTACT' | 'DAMAGED' | 'TORN_SEAL';
  condition?: 'INTACT' | 'DAMAGED' | 'TORN_SEAL';
  note?: string;
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
    timestamp?: string;
  };
}
