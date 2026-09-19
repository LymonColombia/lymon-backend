import {
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SubmitCheckInInfoCommand } from './submit-check-in-info.command';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';

@CommandHandler(SubmitCheckInInfoCommand)
export class SubmitCheckInInfoHandler
  implements ICommandHandler<SubmitCheckInInfoCommand, void>
{
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
  ) {}

  async execute(command: SubmitCheckInInfoCommand): Promise<void> {
    const reservationId = ReservationId.create(command.reservationId);
    const guestAccountId = GuestAccountId.createFromString(
      command.guestAccountId,
    );

    const reservation =
      await this.reservationRepository.findById(reservationId);
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
      guestRecord.getGuestAccountId()!.toString() !==
      guestAccountId.toString()
    ) {
      throw new ForbiddenException(
        'You do not have access to this reservation.',
      );
    }

    reservation.setCheckInInfo(command.travelers);
    await this.reservationRepository.save(reservation);
  }
}
