import { DeletePropertyCommand } from '@/application/property/commands/delete-property.command';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';

@CommandHandler(DeletePropertyCommand)
export class DeletePropertyHandler implements ICommandHandler<
  DeletePropertyCommand,
  void
> {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeletePropertyCommand): Promise<void> {
    const propertyId = PropertyId.create(command.propertyId);
    const property = await this.propertyRepository.findById(propertyId);

    if (!property || property?.getTenantId().toString() !== command.tenantId) {
      throw new NotFoundException(
        `Property with id "${command.propertyId}" not found`,
      );
    }

    const hasActiveReservations =
      await this.reservationRepository.existsActiveByPropertyId(
        command.tenantId,
        command.propertyId,
      );

    if (hasActiveReservations) {
      throw new ForbiddenException(
        'Property cannot be deleted because it has active reservations',
      );
    }

    await this.propertyRepository.delete(propertyId);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.PROPERTY_DELETED,
        AuditEntityType.PROPERTY,
        command.propertyId,
      ),
    );
  }
}
