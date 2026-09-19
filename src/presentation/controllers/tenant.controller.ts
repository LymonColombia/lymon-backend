import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
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
import { UpdateTenantProfileDto } from '@/presentation/dtos/tenant/update-tenant-profile.dto';
import { UpdateTenantProfileCommand } from '@/application/tenant/commands/update-tenant-profile.command';
import { UpdateTenantProfileResult } from '@/application/tenant/commands/update-tenant-profile.result';
import { DeleteTenantCommand } from '@/application/tenant/commands/delete-tenant/delete-tenant.command';
import { GetTenantProfileQuery } from '@/application/tenant/queries/GetTenantProfile/get-tenant-profile.query';
import { GetTenantProfileResult } from '@/application/tenant/queries/GetTenantProfile/get-tenant-profile.result';

@ApiTags('tenant')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('tenant')
export class TenantController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get tenant profile' })
  @ApiResponse({ status: 200, description: 'Tenant profile data' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    const result = await this.queryBus.execute<
      GetTenantProfileQuery,
      GetTenantProfileResult
    >(new GetTenantProfileQuery(user.tenantId));

    return { data: result.profile };
  }

  @Patch('profile')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.TENANT_SETTINGS_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tenant profile (Owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Tenant profile updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only the Owner can modify tenant profile',
  })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTenantProfileDto,
  ) {
    const result = await this.commandBus.execute<
      UpdateTenantProfileCommand,
      UpdateTenantProfileResult
    >(
      new UpdateTenantProfileCommand(
        user.tenantId,
        dto.name,
        dto.contactPhone,
        dto.address,
        dto.description,
        dto.theme,
        dto.logoKey,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Tenant profile updated successfully',
      data: { tenantId: result.tenantId },
    };
  }

  @Delete()
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.TENANT_SETTINGS_EDIT)
  @ApiOperation({
    summary: 'Delete tenant and its users (Owner only/Soft delete)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant deleted successfully',
  })
  async deleteTenant(@CurrentUser() user: JwtPayload) {
    const command = new DeleteTenantCommand(user.tenantId);
    await this.commandBus.execute(command);

    return {
      message: 'Tenant and associated users deleted successfully',
    };
  }
}
