import { Injectable } from '@nestjs/common';
import {
  AuditLog,
  AuditLogId,
} from '@/domain/audit/entities/audit-log.entity';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLogFilters,
  AuditLogRepository,
  PaginatedResult,
  Pagination,
} from '@/domain/audit/repositories/audit-log.repository';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type audit_logs as AuditLogRow,
} from '@/infrastructure/persistence/prisma/generated/client';

const json = (
  value: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull =>
  value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue);

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(log: AuditLog): Promise<void> {
    await this.prisma.audit_logs.create({
      data: {
        tenant_id: log.getTenantId(),
        user_id: log.getUserId(),
        user_email: log.getUserEmail(),
        action: log.getAction(),
        entity_type: log.getEntityType(),
        entity_id: log.getEntityId() ?? null,
        metadata: json(log.getMetadata()),
        previous_value: json(log.getPreviousValue()),
        new_value: json(log.getNewValue()),
        ip_address: log.getIpAddress() ?? null,
        created_at: log.getCreatedAt(),
      },
    });
  }

  async findByTenant(
    tenantId: string,
    filters: AuditLogFilters,
    pagination: Pagination,
  ): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.audit_logsWhereInput = {
      tenant_id: tenantId,
      ...(filters.userId ? { user_id: filters.userId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entity_type: filters.entityType } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            created_at: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.audit_logs.count({ where }),
      this.prisma.audit_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  private toDomain(row: AuditLogRow): AuditLog {
    return AuditLog.reconstitute(AuditLogId.createFromString(row.id), {
      tenantId: row.tenant_id,
      userId: row.user_id,
      userEmail: row.user_email,
      action: row.action as AuditAction,
      entityType: row.entity_type as AuditEntityType,
      entityId: row.entity_id ?? undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      previousValue: (row.previous_value as Record<string, unknown>) ?? undefined,
      newValue: (row.new_value as Record<string, unknown>) ?? undefined,
      ipAddress: row.ip_address ?? undefined,
      createdAt: row.created_at,
    });
  }
}
