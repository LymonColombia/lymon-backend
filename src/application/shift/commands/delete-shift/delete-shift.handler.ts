import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteShiftCommand } from './delete-shift.command';
import { DeleteShiftCommandResult } from './delete-shift.result';
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
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '@/application/shared/services/email.service';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ShiftId } from '@/domain/shift/value-objects/shift-id.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';

@CommandHandler(DeleteShiftCommand)
export class DeleteShiftCommandHandler implements ICommandHandler<DeleteShiftCommand> {
  constructor(
    @Inject(SHIFT_REPOSITORY)
    private readonly shiftRepository: ShiftRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: DeleteShiftCommand,
  ): Promise<DeleteShiftCommandResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const shiftId = ShiftId.createFromString(command.shiftId);

    const shift = await this.shiftRepository.findById(shiftId);
    if (!shift?.getTenantId().equals(tenantId)) {
      throw new NotFoundException('Shift not found for the tenant');
    }

    const deletedShiftId = shift.getId()?.toString() ?? command.shiftId;

    const staffMemberIds = shift.getStaffMemberIds();
    const propertyId = shift.getPropertyId();

    const staffMembers = await Promise.all(
      staffMemberIds.map((staffMemberId) =>
        this.userRepository.findById(staffMemberId),
      ),
    );

    const property = await this.propertyRepository.findById(propertyId);
    await this.shiftRepository.delete(shiftId);

    const validStaffMembers = staffMembers.filter(
      (
        staffMember,
      ): staffMember is NonNullable<(typeof staffMembers)[number]> =>
        staffMember !== null &&
        staffMember.getTenantId().equals(tenantId) &&
        !staffMember.isOwner(),
    );

    if (validStaffMembers.length > 0 && property) {
      await this.emailService.sendEmail({
        to: validStaffMembers.map((staffMember) => ({
          email: staffMember.getEmail().toString(),
          name: staffMember.getEmail().toString(),
        })),
        subject: 'Shift cancelled',
        htmlContent: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <p>Your shift has been cancelled.</p>
            <p><strong>Date range:</strong> ${this.formatDate(shift.getStartDate())} - ${shift.getEndDate() ? this.formatDate(shift.getEndDate()!) : 'No end date'}</p>
            <p><strong>Time:</strong> ${shift.getStartHour()} - ${shift.getEndHour()}</p>
            <p><strong>Property:</strong> ${property.getName()}</p>
          </div>
        `,
      });
    }

    if (command.actorId && command.actorEmail) {
      this.eventEmitter.emit(
        AUDIT_LOG_EVENT,
        new AuditLoggedEvent(
          command.tenantId,
          command.actorId,
          command.actorEmail,
          AuditAction.SHIFT_DELETED as AuditAction,
          AuditEntityType.SHIFT as AuditEntityType,
          deletedShiftId,
          undefined,
          undefined,
          undefined,
        ),
      );
    }

    return new DeleteShiftCommandResult(
      deletedShiftId,
      'Shift deleted successfully',
    );
  }

  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
