import {
  BadRequestException,
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssignStaffToShiftCommand } from './assign-staff-to-shift.command';
import { AssignStaffToShiftCommandResult } from './assign-staff-to-shift.result';
import { Shift } from '@/domain/shift/entities/shift.entity';
import {
  SHIFT_REPOSITORY,
  type ShiftRepository,
} from '@/domain/shift/repositories/shift.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import { ShiftNotificationService } from '@/application/shift/services/shift-notification.service';
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

@CommandHandler(AssignStaffToShiftCommand)
export class AssignStaffToShiftCommandHandler implements ICommandHandler<AssignStaffToShiftCommand> {
  constructor(
    @Inject(SHIFT_REPOSITORY)
    private readonly shiftRepository: ShiftRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly shiftNotificationService: ShiftNotificationService,
    private readonly auditDiffService: ShiftAuditDiffService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: AssignStaffToShiftCommand,
  ): Promise<AssignStaffToShiftCommandResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const shiftId = ShiftId.createFromString(command.shiftId);

    // Find shift
    const shift = await this.shiftRepository.findById(shiftId);
    if (!shift?.getTenantId?.()?.equals?.(tenantId)) {
      throw new NotFoundException('Shift not found for the tenant');
    }

    // Parse new staff member IDs
    const newStaffMemberIds = this.toDistinctUserIds(command.staffMemberIds);
    if (newStaffMemberIds.length === 0) {
      throw new BadRequestException(
        'At least one staff member ID must be provided',
      );
    }

    // Get staff members to validate they exist
    const staffMembers = await this.getStaffMembers(
      newStaffMemberIds,
      tenantId,
    );

    // Get existing staff member IDs
    const existingStaffMemberIds = shift.getStaffMemberIds();

    // Merge: add new staff to existing (union, avoid duplicates)
    const allStaffMemberIds = this.mergeStaffMemberIds(
      existingStaffMemberIds,
      newStaffMemberIds,
    );

    // Check for overlapping shifts for NEW staff members only
    await this.checkStaffMemberOverlaps(
      newStaffMemberIds,
      shift,
      tenantId,
      shiftId,
    );

    // Snapshot before update
    const previousSnapshot = this.auditDiffService.snapshot(shift);

    // Update shift with merged staff list
    try {
      shift.update(
        {
          staffMemberIds: allStaffMemberIds,
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

    // Snapshot after update
    const nextSnapshot = this.auditDiffService.snapshot(shift);
    const auditDiff = this.auditDiffService.diff(
      previousSnapshot,
      nextSnapshot,
    );

    // Save shift
    const updatedShiftId = await this.shiftRepository.save(shift);

    // Send notification to newly assigned staff
    if (staffMembers.length > 0) {
      await this.shiftNotificationService.sendStaffAssignedToShiftEmail(
        staffMembers,
        shift,
      );
    }

    // Emit audit log
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
            action: 'Staff assigned',
            newStaffCount: newStaffMemberIds.length,
            totalStaffCount: allStaffMemberIds.length,
          },
          auditDiff.previousValue,
          auditDiff.newValue,
        ),
      );
    }

    return new AssignStaffToShiftCommandResult(
      updatedShiftId,
      allStaffMemberIds.map((id) => id.toString()),
    );
  }

  private toDistinctUserIds(values: string[]): UserId[] {
    if (!values || values.length === 0) {
      return [];
    }

    const uniqueValues = [...new Set(values)];
    return uniqueValues.map((value) => UserId.createFromString(value));
  }

  private mergeStaffMemberIds(
    existingIds: UserId[],
    newIds: UserId[],
  ): UserId[] {
    const existingSet = new Set(existingIds.map((id) => id.toString()));
    const mergedIds = [...existingIds];

    for (const newId of newIds) {
      if (!existingSet.has(newId.toString())) {
        mergedIds.push(newId);
      }
    }

    return mergedIds;
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

  private async checkStaffMemberOverlaps(
    staffMemberIds: UserId[],
    shift: Shift,
    tenantId: TenantId,
    shiftId: ShiftId,
  ): Promise<void> {
    for (const staffMemberId of staffMemberIds) {
      const overlappingShift: Shift | null =
        await this.shiftRepository.findOverlappingByStaffInRange(
          tenantId,
          staffMemberId,
          {
            startDate: shift.getStartDate(),
            endDate: shift.getEndDate(),
            startMinutes: shift.getStartMinutes(),
            endMinutes: shift.getEndMinutes(),
          },
          shiftId,
        );

      if (overlappingShift) {
        throw new ConflictException(
          `Staff member ${staffMemberId.toString()} already has an overlapping shift`,
        );
      }
    }
  }
}
