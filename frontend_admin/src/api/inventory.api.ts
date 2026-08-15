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
  is_flagged: boolean;
  isFlagged: boolean;
}

export interface AgingListData {
  items: AgingItem[];
  pagination: { total: number; page: number; limit: number; total_pages: number; totalPages: number };
  sla_thresholds: { warning_hours: number; critical_hours: number };
}

export interface SummaryData {
  total: number;
  by_status: { status: string; count: number }[];
  byStatus: { status: string; count: number }[];
  by_aging: { NORMAL: number; WARNING: number; CRITICAL: number };
  byAging: { NORMAL: number; WARNING: number; CRITICAL: number };
  by_zone: { zone_code: string; zone_name: string; zone_type: string; count: number }[];
  byZone: { zone_code: string; zone_name: string; zone_type: string; count: number }[];
  sla_thresholds: { warning_hours: number; critical_hours: number };
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
    aging_status?: AgingStatus;
    page?: number;
    limit?: number;
    sort?: string;
    status?: string;
  }): Promise<InventoryApiResponse<AgingListData>> =>
    axiosClient.get('/api/inventory/aging', { params }).then(r => r.data),

  getSummary: (hub_id?: string): Promise<InventoryApiResponse<SummaryData>> =>
    axiosClient.get('/api/inventory/summary', { params: { hub_id } }).then(r => r.data),

  getMovementHistory: (trackingCode: string, page = 1, limit = 20): Promise<InventoryApiResponse<MovementHistoryData>> =>
    axiosClient.get(`/api/inventory/${trackingCode}/movement-history`, { params: { page, limit } }).then(r => r.data),

  exportInventory: (params: { hub_id?: string; aging_status?: AgingStatus; format?: 'json' | 'csv' }): Promise<InventoryApiResponse<{ items: any[]; count: number }>> =>
    axiosClient.get('/api/inventory/export', { params }).then(r => r.data),

  performAction: (payload: {
    tracking_code: string;
    action_type: InventoryActionType;
    reason?: string;
  }): Promise<InventoryApiResponse<{ tracking_code: string; new_status: string; action: string }>> =>
    axiosClient.post('/api/inventory/action', payload).then(r => r.data),
};
