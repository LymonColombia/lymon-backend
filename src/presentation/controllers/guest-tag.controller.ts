import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { GetGuestTagsQuery } from '@/application/guest-tag/queries/get-guest-tags/get-guest-tags.query';
import type { GetGuestTagsResult } from '@/application/guest-tag/queries/get-guest-tags/get-guest-tags.result';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('guest-tags')
@ApiBearerAuth('JWT-auth')
@Controller('guest-tags')
export class GuestTagController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({ summary: 'List all available guest tags' })
  @ApiResponse({
    status: 200,
    description: 'Guest tags retrieved successfully',
  })
  async getAll(@CurrentUser() user: JwtPayload): Promise<GetGuestTagsResult> {
    return this.queryBus.execute<GetGuestTagsQuery, GetGuestTagsResult>(
      new GetGuestTagsQuery(user.tenantId),
    );
  }
}
