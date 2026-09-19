import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { ApproveRefundCommand } from '@/application/refund/commands/approve-refund/approve-refund.command';
import { DenyRefundCommand } from '@/application/refund/commands/deny-refund/deny-refund.command';
import { GetRefundRequestsQuery } from '@/application/refund/queries/get-refund-requests/get-refund-requests.query';
import type { GetRefundRequestsResult } from '@/application/refund/queries/get-refund-requests/get-refund-requests.handler';
import { ApproveRefundDto } from '@/presentation/dtos/refund/approve-refund.dto';
import { DenyRefundDto } from '@/presentation/dtos/refund/deny-refund.dto';

@ApiTags('refunds')
@ApiBearerAuth('JWT-auth')
@UseGuards(PermissionGuard)
@Controller('refund-requests')
export class RefundController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({ summary: 'List refund requests for the tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'DENIED'],
  })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ): Promise<GetRefundRequestsResult> {
    return this.queryBus.execute(
      new GetRefundRequestsQuery(user.tenantId, page, limit, status),
    );
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({ summary: 'Approve a pending refund request' })
  @ApiResponse({ status: 200, description: 'Refund request approved' })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async approve(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() _dto: ApproveRefundDto,
  ) {
    await this.commandBus.execute(
      new ApproveRefundCommand(id, user.tenantId, user.userId, user.email),
    );
    return { message: 'Refund request approved successfully' };
  }

  @Patch(':id/deny')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({ summary: 'Deny a pending refund request' })
  @ApiResponse({ status: 200, description: 'Refund request denied' })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async deny(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() _dto: DenyRefundDto,
  ) {
    await this.commandBus.execute(
      new DenyRefundCommand(id, user.tenantId, user.userId, user.email),
    );
    return { message: 'Refund request denied successfully' };
  }
}
