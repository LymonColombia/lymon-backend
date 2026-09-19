export interface AuditLogDto {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface GetAuditLogsResult {
  items: AuditLogDto[];
  total: number;
  page: number;
  limit: number;
}
