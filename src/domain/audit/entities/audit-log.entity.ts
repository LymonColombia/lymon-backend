import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import type { AuditLogData } from '../interfaces/audit-log.interface';

export class AuditLogId {
  private constructor(private readonly value: string) {}

  static createFromString(id: string): AuditLogId {
    return new AuditLogId(id);
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Immutable audit log entry.
 */
export class AuditLog {
  private constructor(
    private readonly id: AuditLogId | null,
    private readonly tenantId: string,
    private readonly userId: string,
    private readonly userEmail: string,
    private readonly action: AuditAction,
    private readonly entityType: AuditEntityType,
    private readonly entityId: string | undefined,
    private readonly metadata: Record<string, unknown> | undefined,
    private readonly previousValue: Record<string, unknown> | undefined,
    private readonly newValue: Record<string, unknown> | undefined,
    private readonly ipAddress: string | undefined,
    private readonly createdAt: Date,
  ) {}

  static create(data: AuditLogData): AuditLog {
    return new AuditLog(
      null,
      data.tenantId,
      data.userId,
      data.userEmail,
      data.action,
      data.entityType,
      data.entityId,
      data.metadata,
      data.previousValue,
      data.newValue,
      data.ipAddress,
      new Date(),
    );
  }

  static reconstitute(id: AuditLogId, data: AuditLogData): AuditLog {
    return new AuditLog(
      id,
      data.tenantId,
      data.userId,
      data.userEmail,
      data.action,
      data.entityType,
      data.entityId,
      data.metadata,
      data.previousValue,
      data.newValue,
      data.ipAddress,
      data.createdAt,
    );
  }

  getId(): AuditLogId | null {
    return this.id;
  }

  getTenantId(): string {
    return this.tenantId;
  }

  getUserId(): string {
    return this.userId;
  }

  getUserEmail(): string {
    return this.userEmail;
  }

  getAction(): AuditAction {
    return this.action;
  }

  getEntityType(): AuditEntityType {
    return this.entityType;
  }

  getEntityId(): string | undefined {
    return this.entityId;
  }

  getMetadata(): Record<string, unknown> | undefined {
    return this.metadata;
  }

  getPreviousValue(): Record<string, unknown> | undefined {
    return this.previousValue;
  }

  getNewValue(): Record<string, unknown> | undefined {
    return this.newValue;
  }

  getIpAddress(): string | undefined {
    return this.ipAddress;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
