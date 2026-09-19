import {
  Body,
  Controller,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
  Get,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { ChangePasswordCommand } from '@/application/user/commands/change-password/change-password.command';
import { ChangePasswordResult } from '@/application/user/commands/change-password/change-password.handler';
import { CompleteTutorialCommand } from '@/application/user/commands/complete-tutorial/complete-tutorial.command';
import { ChangePasswordDto } from '@/presentation/dtos/auth/change-password.dto';
import { InviteStaffDto } from '@/presentation/dtos/tenant/invite-staff.dto';
import { InviteStaffCommand } from '@/application/user/commands/invite-staff/invite-staff.command';
import { RoleAssignment } from '@/domain/user/entities/user.entity';
import { UpdateStaffDto } from '@/presentation/dtos/tenant/update-staff.dto';
import { UpdateStaffProfileDto } from '@/presentation/dtos/tenant/update-staff-profile.dto';
import { AddRolesDto } from '@/presentation/dtos/tenant/add-roles.dto';
import { RemoveRoleDto } from '@/presentation/dtos/tenant/remove-role.dto';
import { UpdateStaffCommand } from '@/application/user/commands/update-staff.command';
import { AddRolesCommand } from '@/application/user/commands/add-roles.command';
import { RemoveAllRolesCommand } from '@/application/user/commands/remove-all-roles.command';
import { RemoveRoleCommand } from '@/application/user/commands/remove-role.command';
import { GetStaffByTenantQuery } from '@/application/user/queries/get-staff-by-tenant/get-staff-by-tenant.query';
import { DeleteUserCommand } from '@/application/user/commands/delete-user/delete-user.command';
import type {
  GetStaffByTenantResult,
  StaffDto,
} from '@/application/user/queries/get-staff-by-tenant/get-staff-by-tenant.result';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() jwtPayload: JwtPayload,
  ) {
    const command = new ChangePasswordCommand(
      jwtPayload.userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

    const result = await this.commandBus.execute<
      ChangePasswordCommand,
      ChangePasswordResult
    >(command);

    return {
      message: result.message,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('complete-tutorial')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark tutorial as completed for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tutorial marked as completed',
  })
  async completeTutorial(@CurrentUser() jwtPayload: JwtPayload) {
    await this.commandBus.execute(
      new CompleteTutorialCommand(jwtPayload.userId),
    );

    return {
      message: 'Tutorial completed successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('add-staff')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Invite a staff member to the tenant' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Staff member added successfully',
  })
  async addStaff(
    @Body() dto: InviteStaffDto,
    @CurrentUser() jwtPayload: JwtPayload,
  ) {
    const command = new InviteStaffCommand(
      dto.email,
      dto.password,
      jwtPayload.tenantId,
      dto.roleAssignments as unknown as RoleAssignment[],
      jwtPayload.userId,
      jwtPayload.email,
      dto.fullName,
      dto.document,
    );

    await this.commandBus.execute(command);

    return {
      message: 'Staff member added successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('staff')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List invited staff for the current tenant',
    description:
      'Retrieves a list of staff members associated with the current tenant, including their assigned roles and access scopes (TENANT, PROPERTY, or UNIT). Contains detailed information about accessible resources like property or unit IDs and names.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Staff retrieved successfully' },
        total: { type: 'number', example: 1 },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              email: {
                type: 'string',
                format: 'email',
                example: 'staff@example.com',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2026-05-14T14:30:00.000Z',
              },
              isOwner: { type: 'boolean', example: false },
              emailVerified: { type: 'boolean', example: true },
              roleAssignments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    roleId: { type: 'string', example: 'staff-role-id' },
                    scope: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['TENANT', 'PROPERTY', 'UNIT'],
                          example: 'PROPERTY',
                        },
                        resourceIds: {
                          type: 'array',
                          items: { type: 'string', format: 'uuid' },
                          example: ['987e6543-e21b-34d3-a456-426614174111'],
                        },
                        resources: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string',
                                format: 'uuid',
                                example: '987e6543-e21b-34d3-a456-426614174111',
                              },
                              name: { type: 'string', example: 'Sunset Villa' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getStaff(
    @CurrentUser() jwtPayload: JwtPayload,
  ): Promise<{ message: string; data: StaffDto[]; total: number }> {
    const result = await this.queryBus.execute<
      GetStaffByTenantQuery,
      GetStaffByTenantResult
    >(new GetStaffByTenantQuery(jwtPayload.tenantId));

    const items: StaffDto[] = result?.items ?? [];

    return {
      message: 'Staff retrieved successfully',
      data: items,
      total: items.length,
    };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TENANT_USERS_MANAGE)
  @Patch('staff/:id/profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update staff profile (fullName, document)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staff profile updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions',
  })
  async updateStaffProfile(
    @Param('id') userId: string,
    @Body() dto: UpdateStaffProfileDto,
    @CurrentUser() jwtPayload: JwtPayload,
  ) {
    const command = new UpdateStaffCommand(
      userId,
      undefined,
      undefined,
      undefined,
      dto.fullName,
      dto.document,
      jwtPayload.tenantId,
      jwtPayload.userId,
      jwtPayload.email,
    );

    await this.commandBus.execute(command);

    return {
      message: 'Staff profile updated successfully',
    };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TENANT_USERS_MANAGE)
  @Post('staff/:id/roles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add roles to a staff member (additive)' })
  async addRolesToStaff(
    @Param('id') userId: string,
    @Body() dto: AddRolesDto,
    @CurrentUser() jwtPayload: JwtPayload,
  ) {
    const command =
      new (require('@/application/user/commands/add-roles.command').AddRolesCommand)(
        userId,
        dto.roleAssignments,
        jwtPayload.tenantId,
        jwtPayload.userId,
        jwtPayload.email,
      );
    await this.commandBus.execute(command);
    return { message: 'Roles added successfully' };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TENANT_USERS_MANAGE)
  @Delete('staff/:id/roles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove all roles from a staff member' })
  async removeAllRolesFromStaff(
    @Param('id') userId: string,
    @CurrentUser() jwtPayload: JwtPayload,
  ) {
    const command =
      new (require('@/application/user/commands/remove-all-roles.command').RemoveAllRolesCommand)(
        userId,
        jwtPayload.tenantId,
        jwtPayload.userId,
        jwtPayload.email,
      );
    await this.commandBus.execute(command);
    return { message: 'All roles removed successfully' };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TENANT_USERS_MANAGE)
  @Delete('staff/:id/roles/:roleId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove a specific role assignment from a staff member',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID to remove' })
  @ApiQuery({
    name: 'scopeType',
    required: false,
    description:
      'Optional scope type (TENANT|PROPERTY|UNIT). If omitted, all assignments with roleId will be removed.',
  })
  @ApiQuery({
    name: 'resourceId',
    required: false,
    description:
      'Optional resource id (e.g., propertyId or unitId) to remove a specific assignment',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request - invalid scope or payload',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions',
  })
  async removeRoleFromStaff(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
    @Query('scopeType') scopeType: string | undefined,
    @Query('resourceId') resourceId: string | undefined,
    @CurrentUser() jwtPayload: JwtPayload,
  ) {
    let scope = undefined as any;
    if (scopeType && resourceId) {
      scope = { type: scopeType, resourceIds: [resourceId] };
    }

    const command =
      new (require('@/application/user/commands/remove-role.command').RemoveRoleCommand)(
        userId,
        roleId,
        scope,
        jwtPayload.tenantId,
        jwtPayload.userId,
        jwtPayload.email,
      );
    await this.commandBus.execute(command);
    return { message: 'Role removed successfully' };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TENANT_SETTINGS_EDIT)
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete staff member (Soft delete)' })
  @ApiParam({ name: 'id', description: 'User ID to delete' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
  })
  async deleteUser(@Param('id') userId: string) {
    const command = new DeleteUserCommand(userId);
    await this.commandBus.execute(command);

    return {
      message: 'User deleted successfully',
    };
  }
}
