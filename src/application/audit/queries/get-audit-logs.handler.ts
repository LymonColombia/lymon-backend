import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetAuditLogsQuery } from './get-audit-logs.query';
import {
  AUDIT_LOG_REPOSITORY,
  type AuditLogRepository,
} from '@/domain/audit/repositories/audit-log.repository';
import type { GetAuditLogsResult } from './get-audit-logs.result';

@QueryHandler(GetAuditLogsQuery)
export class GetAuditLogsHandler implements IQueryHandler<
  GetAuditLogsQuery,
  GetAuditLogsResult
> {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(query: GetAuditLogsQuery): Promise<GetAuditLogsResult> {
    const result = await this.auditLogRepository.findByTenant(
      query.tenantId,
      query.filters,
      { page: query.page, limit: query.limit },
    );

    return {
      items: result.items.map((log) => ({
        id: log.getId()!.toString(),
        userId: log.getUserId(),
        userEmail: log.getUserEmail(),
        action: log.getAction(),
        entityType: log.getEntityType(),
        entityId: log.getEntityId(),
        metadata: log.getMetadata(),
        previousValue: log.getPreviousValue(),
        newValue: log.getNewValue(),
        ipAddress: log.getIpAddress(),
        createdAt: log.getCreatedAt().toISOString(),
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
