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
import { GetCancellationRateDto } from '@/presentation/dtos/get-cancellation-rate.dto';
import { GetCancellationRateQuery } from '@/application/metrics/queries/get-cancellation-rate/get-cancellation-rate.query';
import { GetCancellationRateResult } from '@/application/metrics/queries/get-cancellation-rate/get-cancellation-rate.result';

@ApiTags('metrics')
@ApiBearerAuth('JWT-auth')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('cancellation-rate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.FINANCE_VIEW)
  @ApiOperation({ summary: 'Get cancellation and no-show rates' })
  @ApiResponse({
    status: 200,
    description:
      'Returns the cancellation rate metrics for the given date range',
  })
  async getCancellationRate(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetCancellationRateDto,
  ) {
    const result = await this.queryBus.execute<
      GetCancellationRateQuery,
      GetCancellationRateResult
    >(
      new GetCancellationRateQuery(
        user.tenantId,
        query.guestId,
        new Date(query.startDate),
        new Date(query.endDate),
      ),
    );

    return result.metrics;
  }
}
