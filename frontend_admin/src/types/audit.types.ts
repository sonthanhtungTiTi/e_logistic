export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  timestamp: string;
  note: string;
}

export interface AuditFilter {
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}
