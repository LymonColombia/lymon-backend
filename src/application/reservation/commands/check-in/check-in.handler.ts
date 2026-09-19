import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CheckInCommand } from './check-in.command';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';

@CommandHandler(CheckInCommand)
export class CheckInHandler implements ICommandHandler<CheckInCommand> {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CheckInCommand): Promise<void> {
    const id = ReservationId.create(command.reservationId);
    const reservation = await this.reservationRepository.findById(id);

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.getTenantId().toString() !== command.tenantId) {
      throw new NotFoundException('Reservation not found');
    }

    if (command.travelers?.length) {
      reservation.setCheckInInfo(command.travelers);
    }

    try {
      reservation.checkIn(command.actualAt ?? undefined);
    } catch {
      throw new BadRequestException(
        'Cannot check in reservation in its current state',
      );
    }

    await this.reservationRepository.save(reservation);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.RESERVATION_CHECKED_IN,
        AuditEntityType.RESERVATION,
        command.reservationId,
      ),
    );
  }
}
