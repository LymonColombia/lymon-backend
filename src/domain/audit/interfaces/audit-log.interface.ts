import type {
  AuditAction,
  AuditEntityType,
} from '../value-objects/audit-action.vo';

export interface AuditLogData {
  tenantId: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}
