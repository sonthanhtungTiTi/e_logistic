import axiosClient from '@/api/axiosClient';

export type AgingStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'ALL';
export type InventoryActionType = 'AI_REROUTE' | 'RETURN' | 'LIQUIDATE';

export interface AgingItem {
  tracking_code: string;
  trackingCode: string;
  status: string;
  hub_inbound_at: string | null;
  hubInboundAt: string | null;
  dwell_ms: number;
  dwellMs: number;
  dwell_human: string;
  dwellHuman: string;
  aging_status: AgingStatus;
  agingStatus: AgingStatus;
  current_zone: { code: string; name: string; zoneType: string } | null;
  currentZone: { code: string; name: string; zoneType: string } | null;
  destination_hub?: { code: string; name: string; province: string } | null;
  goods_value?: number;
  actual_weight?: number;
  is_flagged: boolean;
  isFlagged: boolean;
}

export interface AgingListData {
  items: AgingItem[];
  pagination: { total: number; page: number; limit: number; total_pages: number; totalPages: number };
  sla_thresholds: { warning_hours: number; critical_hours: number };
}

export interface ZoneSummaryItem {
  zone_id: string;
  zone_code: string;
  zone_name: string;
  zone_type: string;
  count: number;
  current_count: number;
  capacity: number;
  utilization_percent: number;
  capacity_status: 'NORMAL' | 'WARNING' | 'CRITICAL_OVERCAPACITY';
}

export interface SummaryData {
  total: number;
  total_stock_value_vnd?: number;
  by_status: { status: string; count: number }[];
  byStatus: { status: string; count: number }[];
  by_aging: { NORMAL: number; WARNING: number; CRITICAL: number };
  byAging: { NORMAL: number; WARNING: number; CRITICAL: number };
  by_zone: ZoneSummaryItem[];
  byZone: ZoneSummaryItem[];
  throughput_24h?: {
    inbound_count: number;
    outbound_count: number;
    turnover_ratio: number;
    is_velocity_healthy: boolean;
  };
  sla_thresholds: { warning_hours: number; critical_hours: number };
}

export interface TripSuggestion {
  destination_hub_id: string;
  destination_hub_code: string;
  destination_hub_name: string;
  destination_province: string;
  total_items: number;
  total_weight_kg: number;
  tracking_codes: string[];
}

export interface MovementLog {
  _id: string;
  trackingCode: string;
  preStatus: string;
  postStatus: string;
  actionType: string;
  note?: string;
  createdAt: string;
}

export interface MovementHistoryData {
  tracking_code: string;
  current_status: string;
  dwell_human: string;
  aging_status: AgingStatus;
  logs: MovementLog[];
  pagination: { total: number; page: number; limit: number; total_pages: number };
}

export interface InventoryApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const inventoryApi = {
  getAging: (params: {
    hub_id?: string;
    zone_id?: string;
    destination_hub_id?: string;
    aging_status?: AgingStatus;
    search?: string;
    dwell_range?: string;
    page?: number;
    limit?: number;
    sort?: string;
    status?: string;
  }): Promise<InventoryApiResponse<AgingListData>> =>
    axiosClient.get('/inventory/aging', { params }).then(r => r.data),

  getSummary: (hub_id?: string): Promise<InventoryApiResponse<SummaryData>> =>
    axiosClient.get('/inventory/summary', { params: { hub_id } }).then(r => r.data),

  getTripSuggestions: (hub_id?: string): Promise<InventoryApiResponse<TripSuggestion[]>> =>
    axiosClient.get('/inventory/trip-suggestions', { params: { hub_id } }).then(r => r.data),

  createTripFromStock: (data: {
    destination_hub_id: string;
    tracking_codes: string[];
    trip_type?: string;
  }): Promise<InventoryApiResponse<any>> =>
    axiosClient.post('/inventory/create-trip-from-stock', data).then(r => r.data),

  getMovementHistory: (trackingCode: string, page = 1, limit = 20): Promise<InventoryApiResponse<MovementHistoryData>> =>
    axiosClient.get(`/inventory/${trackingCode}/movement-history`, { params: { page, limit } }).then(r => r.data),

  exportInventory: (params: { hub_id?: string; aging_status?: AgingStatus; format?: 'json' | 'csv' }): Promise<any> =>
    axiosClient.get('/inventory/export', { params, responseType: params.format === 'csv' ? 'blob' : 'json' }),

  performAction: (data: {
    tracking_code: string;
    action_type: InventoryActionType;
    reason?: string;
  }): Promise<InventoryApiResponse<{ tracking_code: string; previous_status: string; new_status: string; action_type: string }>> =>
    axiosClient.post('/inventory/action', data).then(r => r.data),

  performBatchAction: (data: {
    tracking_codes: string[];
    action_type: InventoryActionType;
    reason?: string;
  }): Promise<InventoryApiResponse<{ total: number; success_count: number; failed_count: number }>> =>
    axiosClient.post('/inventory/batch-action', data).then(r => r.data),
};
