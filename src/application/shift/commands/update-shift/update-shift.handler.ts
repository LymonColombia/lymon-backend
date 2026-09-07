import {
  BadRequestException,
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateShiftCommand } from './update-shift.command';
import { UpdateShiftCommandResult } from './update-shift.result';
import { Shift } from '@/domain/shift/entities/shift.entity';
import {
  SHIFT_REPOSITORY,
  type ShiftRepository,
} from '@/domain/shift/repositories/shift.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import { ShiftNotificationService } from '@/application/shift/services/shift-notification.service';
import { ShiftAuditDiffService } from '@/domain/shift/services/shift-audit-diff.service';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ShiftId } from '@/domain/shift/value-objects/shift-id.vo';
import { UserId } from '@/domain/user/entities/user.entity';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';

@CommandHandler(UpdateShiftCommand)
export class UpdateShiftCommandHandler implements ICommandHandler<UpdateShiftCommand> {
  constructor(
    @Inject(SHIFT_REPOSITORY)
    private readonly shiftRepository: ShiftRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    private readonly shiftNotificationService: ShiftNotificationService,
    private readonly auditDiffService: ShiftAuditDiffService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: UpdateShiftCommand,
  ): Promise<UpdateShiftCommandResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const shiftId = ShiftId.createFromString(command.shiftId);

    const shift = await this.shiftRepository.findById(shiftId);
    if (!shift?.getTenantId().equals(tenantId)) {
      throw new NotFoundException('Shift not found for the tenant');
    }

    const shiftData = this.resolveShiftData(command, shift);
    this.validateShiftData(shiftData);

    const staffMembers = await this.getStaffMembers(
      shiftData.nextStaffMemberIds,
      tenantId,
    );

    const property = await this.propertyRepository.findById(
      shiftData.nextPropertyId,
    );
    if (!property?.getTenantId().equals(tenantId)) {
      throw new NotFoundException('Property not found for the tenant');
    }

    await this.checkStaffMemberOverlaps(shiftData, tenantId, shiftId);

    const previousSnapshot = this.auditDiffService.snapshot(shift);
    this.applyShiftUpdate(shift, shiftData);
    const nextSnapshot = this.auditDiffService.snapshot(shift);
    const auditDiff = this.auditDiffService.diff(
      previousSnapshot,
      nextSnapshot,
    );

    const updatedShiftId = await this.shiftRepository.save(shift);

    if (staffMembers.length > 0) {
      await this.shiftNotificationService.sendShiftUpdatedEmail(
        staffMembers,
        shift,
        property,
      );
    }

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
          auditDiff.changedFields.length > 0
            ? { changedFields: auditDiff.changedFields }
            : undefined,
          auditDiff.previousValue,
          auditDiff.newValue,
        ),
      );
    }

    return new UpdateShiftCommandResult(
      updatedShiftId,
      'Shift updated successfully',
    );
  }

  private resolveShiftData(
    command: UpdateShiftCommand,
    shift: Shift,
  ): {
    nextStaffMemberIds: UserId[];
    nextPropertyId: PropertyId;
    nextName: string;
    nextStartDate: Date;
    nextEndDate: Date | null;
    nextStartTime: string;
    nextEndTime: string;
    nextStartMinutes: number;
    nextEndMinutes: number;
    weekdays: number[] | null | undefined;
    notes: string | undefined;
  } {
    const propertyIdInput = this.getOptionalString(command.propertyId);
    const startDateInput = this.getOptionalString(command.startDate);
    const endDateInput = this.getNullableString(command.endDate);
    const startHourInput = this.getOptionalString(command.startHour);
    const endHourInput = this.getOptionalString(command.endHour);
    const notesInput = this.getOptionalString(command.notes);

    const nextStaffMemberIds = shift.getStaffMemberIds();
    const nextPropertyId = propertyIdInput
      ? PropertyId.create(propertyIdInput)
      : shift.getPropertyId();
    const nextName = shift.getName();
    const nextStartDate = startDateInput
      ? this.parseShiftDate(startDateInput)
      : shift.getStartDate();
    const nextEndDate = (() => {
      if (endDateInput === undefined) {
        return shift.getEndDate();
      }
      return endDateInput === null ? null : this.parseShiftDate(endDateInput);
    })();
    const nextStartTime = startHourInput ?? shift.getStartHour();
    const nextEndTime = endHourInput ?? shift.getEndHour();

    const weekdays =
      command.weekdays === undefined ? shift.getWeekdays() : command.weekdays;

    return {
      nextStaffMemberIds,
      nextPropertyId,
      nextName,
      nextStartDate,
      nextEndDate,
      nextStartTime,
      nextEndTime,
      nextStartMinutes: this.toMinutes(nextStartTime),
      nextEndMinutes: this.toMinutes(nextEndTime),
      weekdays,
      notes: notesInput ?? shift.getNotes() ?? undefined,
    };
  }

  private validateShiftData(shiftData: {
    nextEndDate: Date | null;
    nextStartDate: Date;
    nextEndMinutes: number;
    nextStartMinutes: number;
  }): void {
    if (
      shiftData.nextEndDate &&
      shiftData.nextEndDate.getTime() < shiftData.nextStartDate.getTime()
    ) {
      throw new BadRequestException(
        'Shift end date cannot be before start date',
      );
    }

    if (shiftData.nextEndMinutes <= shiftData.nextStartMinutes) {
      throw new BadRequestException('Shift end time must be after start time');
    }
  }

  private async checkStaffMemberOverlaps(
    shiftData: {
      nextStaffMemberIds: UserId[];
      nextStartDate: Date;
      nextEndDate: Date | null;
      nextStartMinutes: number;
      nextEndMinutes: number;
      weekdays: number[] | null | undefined;
    },
    tenantId: TenantId,
    shiftId: ShiftId,
  ): Promise<void> {
    for (const staffMemberId of shiftData.nextStaffMemberIds) {
      const overlappingShift: Shift | null =
        await this.shiftRepository.findOverlappingByStaffInRange(
          tenantId,
          staffMemberId,
          shiftData.nextStartDate,
          shiftData.nextEndDate,
          shiftData.nextStartMinutes,
          shiftData.nextEndMinutes,
          shiftId,
          shiftData.weekdays,
        );

      if (overlappingShift) {
        throw new ConflictException(
          `Staff member ${staffMemberId.toString()} already has an overlapping shift`,
        );
      }
    }
  }

  private applyShiftUpdate(
    shift: Shift,
    shiftData: {
      nextStaffMemberIds: UserId[];
      nextPropertyId: PropertyId;
      nextName: string;
      nextStartDate: Date;
      nextEndDate: Date | null;
      nextStartTime: string;
      nextEndTime: string;
      nextStartMinutes: number;
      nextEndMinutes: number;
      weekdays: number[] | null | undefined;
      notes: string | undefined;
    },
  ): void {
    try {
      shift.update(
        {
          staffMemberIds: shiftData.nextStaffMemberIds,
          propertyId: shiftData.nextPropertyId,
          name: shiftData.nextName,
          startDate: shiftData.nextStartDate,
          endDate: shiftData.nextEndDate,
          startHour: shiftData.nextStartTime,
          endHour: shiftData.nextEndTime,
          weekdays: shiftData.weekdays,
          notes: shiftData.notes,
        },
        new Date(),
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private toMinutes(value: string): number {
    const [hoursRaw, minutesRaw] = value.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('Invalid shift time format');
    }

    return hours * 60 + minutes;
  }

  private parseShiftDate(value: string): Date {
    const shiftDate = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(shiftDate.getTime())) {
      throw new BadRequestException('Invalid shift date');
    }
    return shiftDate;
  }

  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private resolveNextEndDate(
    endDate: string | null | undefined,
    currentEndDate: Date | null,
  ): Date | null {
    if (endDate === undefined) {
      return currentEndDate;
    }

    if (endDate === null) {
      return null;
    }

    return this.parseShiftDate(endDate);
  }

  private getShiftSnapshot(shift: {
    getStaffMemberIds(): UserId[];
    getPropertyId(): PropertyId;
    getStartDate(): Date;
    getEndDate(): Date | null;
    getStartHour(): string;
    getEndHour(): string;
    getNotes(): string | null;
  }): Record<string, unknown> {
    return {
      staffMemberIds: shift.getStaffMemberIds().map((id) => id.toString()),
      propertyId: shift.getPropertyId().toString(),
      startDate: this.formatDate(shift.getStartDate()),
      endDate: shift.getEndDate() ? this.formatDate(shift.getEndDate()!) : null,
      startHour: shift.getStartHour(),
      endHour: shift.getEndHour(),
      notes: shift.getNotes(),
    };
  }

  private getOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private getNullableString(value: unknown): string | null | undefined {
    if (value === null) {
      return null;
    }
    return typeof value === 'string' ? value : undefined;
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

    for (const element of staffMembers) {
      const staffMember = element;
      if (!staffMember?.getTenantId().equals(tenantId)) {
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
