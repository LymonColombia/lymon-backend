import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { GetAuditLogsDto } from '@/presentation/dtos/audit/get-audit-logs.dto';
import { GetAuditLogsQuery } from '@/application/audit/queries/get-audit-logs.query';
import { type GetAuditLogsResult } from '@/application/audit/queries/get-audit-logs.result';

@ApiTags('audit')
@ApiBearerAuth('JWT-auth')
@Controller('audit')
export class AuditController {
  constructor(private readonly queryBus: QueryBus) {}

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.AUDIT_VIEW)
  @Get()
  @ApiOperation({ summary: 'Get paginated audit log for the tenant' })
  @ApiResponse({ status: 200, description: 'Audit logs returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — missing AUDIT_VIEW permission',
  })
  async getAuditLogs(
    @CurrentUser() user: JwtPayload,
    @Query() dto: GetAuditLogsDto,
  ): Promise<{ data: GetAuditLogsResult }> {
    const result = await this.queryBus.execute<
      GetAuditLogsQuery,
      GetAuditLogsResult
    >(
      new GetAuditLogsQuery(
        user.tenantId,
        {
          userId: dto.userId,
          action: dto.action,
          entityType: dto.entityType,
          dateFrom: dto.dateFrom ? new Date(dto.dateFrom) : undefined,
          dateTo: dto.dateTo ? new Date(dto.dateTo) : undefined,
        },
        dto.page ?? 1,
        dto.limit ?? 20,
      ),
    );

    return { data: result };
  }
}
