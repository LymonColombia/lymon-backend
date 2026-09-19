import { Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUnitRatingCommand } from './create-unit-rating.command';
import { CreateUnitRatingResult } from './create-unit-rating.result';
import {
  UNIT_RATING_REPOSITORY,
  type UnitRatingRepository,
} from '@/domain/unit-rating/repositories/unit-rating.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { UnitRating } from '@/domain/unit-rating/entities/unit-rating.entity';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';

@CommandHandler(CreateUnitRatingCommand)
export class CreateUnitRatingHandler implements ICommandHandler<CreateUnitRatingCommand> {
  constructor(
    @Inject(UNIT_RATING_REPOSITORY)
    private readonly unitRatingRepository: UnitRatingRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: CreateUnitRatingCommand,
  ): Promise<CreateUnitRatingResult> {
    const reservationId = ReservationId.create(command.reservationId);

    const reservation =
      await this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const tenantId = reservation.getTenantId();

    if (
      reservation.getStatus().getValue() !== ReservationStatusEnum.CHECKED_OUT
    ) {
      throw new DomainException('Ratings can only be submitted after checkout');
    }

    const guestAccountId = GuestAccountId.createFromString(command.actorId);
    const guest = await this.guestRepository.findByGuestAccountId(
      tenantId,
      guestAccountId,
    );
    if (!guest) {
      throw new NotFoundException('Guest profile not found');
    }

    const guestId = guest.getId();
    if (guestId?.toString() !== reservation.getGuestId().toString()) {
      throw new DomainException(
        'This reservation does not belong to the authenticated guest',
      );
    }

    const existing =
      await this.unitRatingRepository.findByReservationId(reservationId);
    if (existing) {
      throw new ConflictException(
        'A rating for this reservation already exists',
      );
    }

    const unitId = reservation.getUnitId();

    const unit = await this.unitRepository.findById(unitId);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const rating = UnitRating.create({
      tenantId,
      unitId,
      guestId,
      reservationId,
      rate: command.rate,
      message: command.message,
    });

    const ratingId = await this.unitRatingRepository.save(rating);

    const newAverage =
      await this.unitRatingRepository.calculateAverageForUnit(unitId);
    unit.updateRating(newAverage);
    await this.unitRepository.save(unit);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        tenantId.toString(),
        command.actorId,
        command.actorEmail,
        AuditAction.UNIT_RATING_CREATED,
        AuditEntityType.UNIT_RATING,
        ratingId,
        { unitId: unitId.toString(), rate: command.rate },
      ),
    );

    return new CreateUnitRatingResult(ratingId);
  }
}
