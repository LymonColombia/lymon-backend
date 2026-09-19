import {
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CancelGuestReservationCommand } from './cancel-guest-reservation.command';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import {
  REFUND_REQUEST_REPOSITORY,
  type RefundRequestRepository,
} from '@/domain/refund/repositories/refund-request.repository';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { CancellationRefundService } from '@/domain/reservation/services/cancellation-refund.service';
import { RefundRequest } from '@/domain/refund/entities/refund-request.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { ReservationSourceEnum } from '@/domain/reservation/value-objects/reservation-source.vo';
import { AuditAction, AuditEntityType } from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';

export interface CancelGuestReservationResult {
  cancelled: true;
  refundAmount: number;
  refundRequestId: string | null;
}

@CommandHandler(CancelGuestReservationCommand)
export class CancelGuestReservationHandler
  implements ICommandHandler<CancelGuestReservationCommand, CancelGuestReservationResult>
{
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(REFUND_REQUEST_REPOSITORY)
    private readonly refundRequestRepository: RefundRequestRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: CancelGuestReservationCommand,
  ): Promise<CancelGuestReservationResult> {
    const reservationId = ReservationId.create(command.reservationId);
    const guestAccountId = GuestAccountId.createFromString(
      command.guestAccountId,
    );

    const reservation = await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const guestRecord = await this.guestRepository.findById(
      reservation.getGuestId(),
    );
    if (!guestRecord?.getGuestAccountId()) {
      throw new ForbiddenException(
        'You do not have access to this reservation.',
      );
    }
    if (
      guestRecord.getGuestAccountId()!.toString() !== guestAccountId.toString()
    ) {
      throw new ForbiddenException(
        'You do not have access to this reservation.',
      );
    }

    if (reservation.getSource().toString() !== ReservationSourceEnum.DIRECT) {
      throw new BadRequestException(
        'Only direct bookings can be cancelled from the portal.',
      );
    }

    if (reservation.getStatus().isPending()) {
      reservation.cancel(command.reason ?? undefined);
      await this.reservationRepository.save(reservation);
      this.emitEvents(reservation, 0, null);
      return { cancelled: true, refundAmount: 0, refundRequestId: null };
    }

    if (reservation.getStatus().toString() !== 'CONFIRMED') {
      throw new BadRequestException(
        'Reservation cannot be cancelled in its current state.',
      );
    }

    const property = await this.propertyRepository.findById(
      reservation.getPropertyId(),
    );
    const tenantId = reservation.getTenantId().toString();

    const refundAmount = CancellationRefundService.calculate(
      reservation.getDateRange().getCheckIn(),
      new Date(),
      reservation.getTotalPrice(),
    );

    reservation.cancel(command.reason ?? undefined);
    await this.reservationRepository.save(reservation);

    let refundRequestId: string | null = null;

    if (refundAmount > 0) {
      const refundRequest = RefundRequest.create({
        tenantId: TenantId.createFromString(tenantId),
        reservationId: reservation.getId()!,
        guestId: reservation.getGuestId(),
        amount: refundAmount,
        reason:
          property?.getName()
          ?? 'Guest cancellation',
      });

      refundRequestId = await this.refundRequestRepository.save(refundRequest);
    }

    this.emitEvents(reservation, refundAmount, refundRequestId);
    return { cancelled: true, refundAmount, refundRequestId };
  }

  private emitEvents(
    reservation: { getId: () => { toString: () => string } | null; getUnitId: () => { toString: () => string }; getDateRange: () => { getCheckIn: () => Date; getCheckOut: () => Date }; getTenantId: () => { toString: () => string }; getGuestId: () => { toString: () => string } },
    refundAmount: number,
    refundRequestId: string | null,
  ): void {
    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        reservation.getTenantId().toString(),
        reservation.getGuestId().toString(),
        'guest',
        AuditAction.RESERVATION_CANCELLED,
        AuditEntityType.RESERVATION,
        reservation.getId()?.toString() ?? '',
        { refundAmount, refundRequestId },
      ),
    );
  }
}
