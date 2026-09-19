import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PayGuestReservationCommand } from './pay-guest-reservation.command';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';

@CommandHandler(PayGuestReservationCommand)
export class PayGuestReservationHandler implements ICommandHandler<PayGuestReservationCommand> {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: PayGuestReservationCommand): Promise<void> {
    const guestAccountId = GuestAccountId.createFromString(
      command.guestAccountId,
    );
    const tenantId = TenantId.createFromString(command.tenantId);

    const guest = await this.guestRepository.findByGuestAccountId(
      tenantId,
      guestAccountId,
    );
    if (!guest) {
      throw new NotFoundException('Guest profile not found');
    }

    const reservation = await this.reservationRepository.findById(
      ReservationId.create(command.reservationId),
    );
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    if (reservation.getGuestId().toString() !== guest.getId()!.toString()) {
      throw new DomainException('Reservation does not belong to this guest');
    }

    reservation.pay();
    await this.reservationRepository.save(reservation);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.RESERVATION_PAID,
        AuditEntityType.RESERVATION,
        command.reservationId,
      ),
    );
  }
}
