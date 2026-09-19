import { GetExperiencePurchasesByTenantQuery } from '@/application/experience-purchase/queries/get-experience-purchases-by-tenant/get-experience-purchases-by-tenant.query';
import { GetExperiencePurchasesByTenantResult } from '@/application/experience-purchase/queries/get-experience-purchases-by-tenant/get-experience-purchases-by-tenant.result';
import { CancelExperiencePurchaseCommand } from '@/application/experience-purchase/commands/cancel-experience-purchase/cancel-experience-purchase.command';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { ExperiencePurchaseStatusEnum } from '@/domain/experience-purchase/value-objects/experience-purchase-status.vo';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { GetExperiencePurchasesDto } from '@/presentation/dtos/experience-purchase/get-experience-purchases.dto';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('experience-purchases')
@ApiBearerAuth('JWT-auth')
@Controller('experience-purchases')
export class ExperiencePurchasesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.PROPERTY_VIEW)
  @ApiOperation({
    summary: 'List experience purchases for the authenticated tenant',
  })
  @ApiQuery({
    name: 'experienceId',
    required: false,
    type: String,
    description: 'Optional experience filter',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Optional scheduled date range start',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Optional scheduled date range end',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ExperiencePurchaseStatusEnum,
    description: 'Optional purchase status filter',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Experience purchases retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetExperiencePurchasesDto,
  ) {
    const result = await this.queryBus.execute<
      GetExperiencePurchasesByTenantQuery,
      GetExperiencePurchasesByTenantResult
    >(
      new GetExperiencePurchasesByTenantQuery(
        user.tenantId,
        query.page ?? 1,
        query.limit ?? 20,
        query.experienceId,
        query.dateFrom,
        query.dateTo,
        query.status,
      ),
    );

    return {
      message: 'Experience purchases retrieved successfully',
      data: {
        purchases: result.purchases,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_DELETE)
  @ApiOperation({ summary: 'Cancel an experience reservation' })
  @ApiResponse({
    status: 200,
    description: 'Experience reservation cancelled successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Experience purchase not found' })
  async cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.commandBus.execute(
      new CancelExperiencePurchaseCommand(id, {
        type: 'tenant',
        tenantId: user.tenantId,
      }),
    );

    return { message: 'Experience reservation cancelled successfully' };
  }
}
