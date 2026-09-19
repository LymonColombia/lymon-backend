import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnassignStaffFromShiftCommand } from './unassign-staff-from-shift.command';
import { UnassignStaffFromShiftCommandResult } from './unassign-staff-from-shift.result';
import {
  SHIFT_REPOSITORY,
  type ShiftRepository,
} from '@/domain/shift/repositories/shift.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import { ShiftAuditDiffService } from '@/domain/shift/services/shift-audit-diff.service';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ShiftId } from '@/domain/shift/value-objects/shift-id.vo';
import { UserId } from '@/domain/user/entities/user.entity';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';

@CommandHandler(UnassignStaffFromShiftCommand)
export class UnassignStaffFromShiftCommandHandler implements ICommandHandler<UnassignStaffFromShiftCommand> {
  constructor(
    @Inject(SHIFT_REPOSITORY)
    private readonly shiftRepository: ShiftRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly auditDiffService: ShiftAuditDiffService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: UnassignStaffFromShiftCommand,
  ): Promise<UnassignStaffFromShiftCommandResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const shiftId = ShiftId.createFromString(command.shiftId);

    const shift = await this.shiftRepository.findById(shiftId);
    if (!shift?.getTenantId?.()?.equals?.(tenantId)) {
      throw new NotFoundException('Shift not found for the tenant');
    }

    const staffMemberIds = this.toDistinctUserIds(command.staffMemberIds);
    if (staffMemberIds.length === 0) {
      throw new BadRequestException(
        'At least one staff member ID must be provided',
      );
    }

    const existingStaffMemberIds = shift.getStaffMemberIds();
    const remainingStaffMemberIds = this.removeStaffMembers(
      existingStaffMemberIds,
      staffMemberIds,
    );

    await this.getStaffMembers(staffMemberIds, tenantId);

    const previousSnapshot = this.auditDiffService.snapshot(shift);

    try {
      shift.update(
        {
          staffMemberIds: remainingStaffMemberIds,
          name: shift.getName(),
        },
        new Date(),
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const nextSnapshot = this.auditDiffService.snapshot(shift);
    const auditDiff = this.auditDiffService.diff(
      previousSnapshot,
      nextSnapshot,
    );

    const updatedShiftId = await this.shiftRepository.save(shift);

    if (command.actorId && command.actorEmail) {
      this.eventEmitter.emit(
        AUDIT_LOG_EVENT,
        new AuditLoggedEvent(
          command.tenantId,
          command.actorId,
          command.actorEmail,
          AuditAction.SHIFT_UPDATED as AuditAction,
          AuditEntityType.SHIFT as AuditEntityType,
          updatedShiftId,
          {
            action: 'Staff unassigned',
            removedStaffCount: staffMemberIds.length,
            remainingStaffCount: remainingStaffMemberIds.length,
          },
          auditDiff.previousValue,
          auditDiff.newValue,
        ),
      );
    }

    return new UnassignStaffFromShiftCommandResult(
      updatedShiftId,
      remainingStaffMemberIds.map((id) => id.toString()),
    );
  }

  private toDistinctUserIds(values: string[]): UserId[] {
    if (!values || values.length === 0) {
      return [];
    }

    const uniqueValues = [...new Set(values)];
    return uniqueValues.map((value) => UserId.createFromString(value));
  }

  private removeStaffMembers(
    existingIds: UserId[],
    staffToRemove: UserId[],
  ): UserId[] {
    const existingSet = new Set(existingIds.map((id) => id.toString()));
    const removeSet = new Set(staffToRemove.map((id) => id.toString()));

    const invalidIds = staffToRemove.filter(
      (staffId) => !existingSet.has(staffId.toString()),
    );
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        'One or more staff members are not assigned to this shift',
      );
    }

    return existingIds.filter((id) => !removeSet.has(id.toString()));
  }

  private async getStaffMembers(
    staffMemberIds: UserId[],
    tenantId: TenantId,
  ): Promise<
    {
      getTenantId(): TenantId;
      isOwner(): boolean;
      getEmail(): { toString(): string };
    }[]
  > {
    const staffMembers = await Promise.all(
      staffMemberIds.map((staffMemberId) =>
        this.userRepository.findById(staffMemberId),
      ),
    );

    for (const staffMember of staffMembers) {
      if (!staffMember?.getTenantId()?.equals(tenantId)) {
        throw new NotFoundException('Staff member not found for the tenant');
      }

      if (staffMember.isOwner()) {
        throw new BadRequestException(
          'Shift can only be assigned to a staff member',
        );
      }
    }

    return staffMembers as {
      getTenantId(): TenantId;
      isOwner(): boolean;
      getEmail(): { toString(): string };
    }[];
  }
}
