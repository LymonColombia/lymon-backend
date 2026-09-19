import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { CreateShiftCommand } from '@/application/shift/commands/create-shift/create-shift.command';
import { CreateShiftCommandResult } from '@/application/shift/commands/create-shift/create-shift.result';
import { UpdateShiftCommand } from '@/application/shift/commands/update-shift/update-shift.command';
import { UpdateShiftCommandResult } from '@/application/shift/commands/update-shift/update-shift.result';
import { DeleteShiftCommand } from '@/application/shift/commands/delete-shift/delete-shift.command';
import { DeleteShiftCommandResult } from '@/application/shift/commands/delete-shift/delete-shift.result';
import { GetShiftsQuery } from '@/application/shift/queries/get-shifts/get-shifts.query';
import {
  type GetShiftsResult,
  type ShiftListItemDto,
} from '@/application/shift/queries/get-shifts/get-shifts.result';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { CreateShiftDto } from '@/presentation/dtos/shift/create-shift.dto';
import { GetShiftsDto } from '@/presentation/dtos/shift/get-shifts.dto';
import { UpdateShiftDto } from '@/presentation/dtos/shift/update-shift.dto';
import { AssignStaffToShiftDto } from '@/presentation/dtos/shift/assign-staff-to-shift.dto';
import { AssignStaffToShiftCommand } from '@/application/shift/commands/assign-staff-to-shift/assign-staff-to-shift.command';
import { AssignStaffToShiftCommandResult } from '@/application/shift/commands/assign-staff-to-shift/assign-staff-to-shift.result';
import { UnassignStaffFromShiftDto } from '@/presentation/dtos/unassign-staff-from-shift.dto';
import { UnassignStaffFromShiftCommand } from '@/application/shift/commands/unassign-staff-from-shift/unassign-staff-from-shift.command';
import { UnassignStaffFromShiftCommandResult } from '@/application/shift/commands/unassign-staff-from-shift/unassign-staff-from-shift.result';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('shifts')
@ApiBearerAuth('JWT-auth')
@Controller('shifts')
export class ShiftsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List work shifts filtered by date and property' })
  @ApiResponse({ status: 200, description: 'Shifts returned successfully' })
  async getShifts(
    @CurrentUser() user: JwtPayload,
    @Query() dto: GetShiftsDto,
  ): Promise<{ data: GetShiftsResult }> {
    const result = await this.queryBus.execute<GetShiftsQuery, GetShiftsResult>(
      new GetShiftsQuery(
        user.tenantId,
        {
          dateFrom: dto.dateFrom ? new Date(dto.dateFrom) : undefined,
          dateTo: dto.dateTo ? new Date(dto.dateTo) : undefined,
          propertyId: dto.propertyId,
        },
        user.userId,
        this.canViewAllStaff(user),
      ),
    );

    return { data: result };
  }

  @Get('staff/:staffMemberId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List work shifts for a specific staff member',
    description:
      'For employee flow, non-manager users can only request their own staff member id.',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff member shifts returned successfully',
  })
  async getShiftsByStaffMember(
    @CurrentUser() user: JwtPayload,
    @Param('staffMemberId') staffMemberId: string,
    @Query() dto: GetShiftsDto,
  ): Promise<{ data: { items: StaffShiftListItemDto[] } }> {
    const result = await this.queryBus.execute<GetShiftsQuery, GetShiftsResult>(
      new GetShiftsQuery(
        user.tenantId,
        {
          dateFrom: dto.dateFrom ? new Date(dto.dateFrom) : undefined,
          dateTo: dto.dateTo ? new Date(dto.dateTo) : undefined,
          propertyId: dto.propertyId,
        },
        user.userId,
        this.canViewAllStaff(user),
        staffMemberId,
      ),
    );

    return {
      data: {
        items: result.items.map((shift) => this.toStaffShiftListItemDto(shift)),
      },
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TENANT_USERS_MANAGE)
  @ApiOperation({ summary: 'Create a work shift for a staff member' })
  @ApiResponse({ status: 201, description: 'Shift created successfully' })
  async createShift(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateShiftDto,
  ) {
    const result = await this.commandBus.execute<
      CreateShiftCommand,
      CreateShiftCommandResult
    >(
      new CreateShiftCommand(
        user.tenantId,
        dto.staffMemberIds ?? [],
        dto.propertyId,
        dto.startDate,
        dto.endDate ?? null,
        dto.startHour,
        dto.endHour,
        dto.name,
        dto.weekdays,
        dto.notes,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Shift created successfully',
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TENANT_USERS_MANAGE)
  @ApiOperation({ summary: 'Update an existing work shift' })
  @ApiResponse({ status: 200, description: 'Shift updated successfully' })
  async updateShift(
    @CurrentUser() user: JwtPayload,
    @Param('id') shiftId: string,
    @Body() dto: UpdateShiftDto,
  ) {
    const result = await this.commandBus.execute<
      UpdateShiftCommand,
      UpdateShiftCommandResult
    >(
      new UpdateShiftCommand(
        shiftId,
        user.tenantId,
        dto.propertyId,
        dto.startDate,
        dto.endDate,
        dto.startHour,
        dto.endHour,
        dto.name,
        dto.weekdays,
        dto.notes,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Shift updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TENANT_USERS_MANAGE)
  @ApiOperation({ summary: 'Delete a work shift' })
  @ApiResponse({ status: 200, description: 'Shift deleted successfully' })
  async deleteShift(
    @CurrentUser() user: JwtPayload,
    @Param('id') shiftId: string,
  ) {
    const result = await this.commandBus.execute<
      DeleteShiftCommand,
      DeleteShiftCommandResult
    >(new DeleteShiftCommand(shiftId, user.tenantId, user.userId, user.email));

    return {
      message: 'Shift deleted successfully',
      data: result,
    };
  }

  @Patch(':id/assign-staff')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TENANT_USERS_MANAGE)
  @ApiOperation({
    summary: 'Assign staff members to an existing shift (additive)',
  })
  @ApiResponse({ status: 200, description: 'Staff assigned successfully' })
  async assignStaffToShift(
    @CurrentUser() user: JwtPayload,
    @Param('id') shiftId: string,
    @Body() dto: AssignStaffToShiftDto,
  ) {
    const result = await this.commandBus.execute<
      AssignStaffToShiftCommand,
      AssignStaffToShiftCommandResult
    >(
      new AssignStaffToShiftCommand(
        shiftId,
        user.tenantId,
        dto.staffMemberIds,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Staff assigned successfully',
      data: result,
    };
  }

  @Patch(':id/unassign-staff')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TENANT_USERS_MANAGE)
  @ApiOperation({
    summary: 'Unassign staff members from an existing shift',
  })
  @ApiResponse({ status: 200, description: 'Staff unassigned successfully' })
  async unassignStaffFromShift(
    @CurrentUser() user: JwtPayload,
    @Param('id') shiftId: string,
    @Body() dto: UnassignStaffFromShiftDto,
  ) {
    const result = await this.commandBus.execute<
      UnassignStaffFromShiftCommand,
      UnassignStaffFromShiftCommandResult
    >(
      new UnassignStaffFromShiftCommand(
        shiftId,
        user.tenantId,
        dto.staffMemberIds,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Staff unassigned successfully',
      data: result,
    };
  }

  private canViewAllStaff(user: JwtPayload): boolean {
    return (
      user.isOwner ||
      user.roleAssignments.some((assignment) =>
        assignment.permissions.includes(Permission.TENANT_USERS_MANAGE),
      )
    );
  }

  private toStaffShiftListItemDto(
    shift: ShiftListItemDto,
  ): StaffShiftListItemDto {
    return {
      id: shift.id,
      tenantId: shift.tenantId,
      propertyId: shift.propertyId,
      name: shift.name,
      startDate: shift.startDate,
      endDate: shift.endDate,
      startHour: shift.startHour,
      endHour: shift.endHour,
      startMinutes: shift.startMinutes,
      endMinutes: shift.endMinutes,
      weekdays: shift.weekdays,
      notes: shift.notes,
      createdBy: shift.createdBy,
      createdByEmail: shift.createdByEmail,
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt,
    };
  }
}

type StaffShiftListItemDto = Omit<ShiftListItemDto, 'staffMemberIds'>;
