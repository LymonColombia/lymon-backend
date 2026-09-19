import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteUnitCommand } from './delete-unit.command';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

@CommandHandler(DeleteUnitCommand)
export class DeleteUnitHandler implements ICommandHandler<
  DeleteUnitCommand,
  void
> {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeleteUnitCommand): Promise<void> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const unitId = UnitId.create(command.unitId);

    const unit = await this.unitRepository.findById(unitId);

    if (!unit?.getTenantId().equals(tenantId)) {
      throw new NotFoundException('Unit not found');
    }

    const hasActiveReservations =
      await this.reservationRepository.existsActiveByUnitId(
        command.tenantId,
        command.unitId,
      );

    if (hasActiveReservations) {
      throw new ForbiddenException(
        'Unit cannot be deleted because it has active reservations',
      );
    }

    await this.unitRepository.delete(unitId);

    if (command.actorId && command.actorEmail) {
      this.eventEmitter.emit(
        AUDIT_LOG_EVENT,
        new AuditLoggedEvent(
          command.tenantId,
          command.actorId,
          command.actorEmail,
          AuditAction.UNIT_DELETED,
          AuditEntityType.UNIT,
          command.unitId,
        ),
      );
    }
  }
}
