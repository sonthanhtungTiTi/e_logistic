import axiosClient from '@/api/axiosClient';

export type AuditScopeType = 'ALL' | 'ZONE' | 'DESTINATION' | 'DATE_RANGE';

export interface StartAuditPayload {
  scope_type?: AuditScopeType;
  scope_value?: string | null;
}

export interface StartAuditData {
  session_code: string;
  sessionCode: string;
  hub_id: string;
  scope_type: string;
  snapshot_count: number;
  snapshotCount: number;
  started_at: string;
  startedAt: string;
  status: string;
}

export interface SyncAuditPayload {
  session_code: string;
  tracking_codes: string[];
  client_offline_id?: string | null;
  is_final_sync?: boolean;
}

export interface SyncAuditData {
  session_code: string;
  sessionCode: string;
  added_count: number;
  addedCount: number;
  total_scanned: number;
  totalScanned: number;
  skipped_duplicate: number;
  skipped_new_inbound: number;
  is_final: boolean;
  isFinal: boolean;
  // Final sync fields:
  matched_count?: number;
  matchedCount?: number;
  missing_count?: number;
  missingCount?: number;
  surplus_count?: number;
  surplusCount?: number;
  missing_tracking_codes?: string[];
  surplus_tracking_codes?: string[];
  status?: string;
}

export interface AuditApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const auditApi = {
  startAudit: (payload: StartAuditPayload): Promise<AuditApiResponse<StartAuditData>> =>
    axiosClient.post('/audit/start', payload).then(r => r.data),

  syncAudit: (payload: SyncAuditPayload): Promise<AuditApiResponse<SyncAuditData>> =>
    axiosClient.post('/audit/sync', payload).then(r => r.data),

  pauseAudit: (sessionCode: string): Promise<AuditApiResponse<{ session_code: string; status: string; scanned_count: number }>> =>
    axiosClient.post(`/audit/${sessionCode}/pause`).then(r => r.data),

  resumeAudit: (sessionCode: string): Promise<AuditApiResponse<{ session_code: string; status: string; scanned_count: number }>> =>
    axiosClient.post(`/audit/${sessionCode}/resume`).then(r => r.data),

  submitAudit: (sessionCode: string): Promise<AuditApiResponse<SyncAuditData>> =>
    axiosClient.post(`/audit/${sessionCode}/submit`).then(r => r.data),

  approveAudit: (sessionCode: string, note?: string): Promise<AuditApiResponse<{ session_code: string; status: string; approved_at: string }>> =>
    axiosClient.post(`/audit/${sessionCode}/approve`, { note }).then(r => r.data),
};
