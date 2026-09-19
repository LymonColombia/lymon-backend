import { Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateReservationCommand } from './create-reservation.command';
import { CreateReservationResult } from './create-reservation.result';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import { ReservationSource } from '@/domain/reservation/value-objects/reservation-source.vo';
import { AvailabilityChecker } from '@/domain/reservation/services/availability-checker.domain-service';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';

@CommandHandler(CreateReservationCommand)
export class CreateReservationHandler implements ICommandHandler<CreateReservationCommand> {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: CreateReservationCommand,
  ): Promise<CreateReservationResult> {
    const unitId = UnitId.create(command.unitId);
    const unit = await this.unitRepository.findById(unitId);
    if (!unit) {
      throw new NotFoundException(`Unit not found`);
    }

    const guestId = GuestId.createFromString(command.guestId);
    const guest = await this.guestRepository.findById(guestId);
    if (!guest) {
      throw new NotFoundException(`Guest not found`);
    }

    const dateRange = DateRange.create(command.checkIn, command.checkOut);

    const existingReservations =
      await this.reservationRepository.findByUnitAndDateRange(
        unitId,
        dateRange,
      );

    if (
      !AvailabilityChecker.isAvailable(
        dateRange,
        existingReservations,
        unit.getInventoryCount(),
      )
    ) {
      throw new ConflictException(
        `Unit is not available for the requested dates`,
      );
    }

    const reservation = Reservation.create({
      tenantId: TenantId.createFromString(command.tenantId),
      propertyId: PropertyId.create(command.propertyId),
      unitId,
      guestId,
      dateRange,
      source: ReservationSource.create(command.source),
      guestsCount: command.guestsCount,
      pricePerNight: unit.getPricePerNight(),
      notes: command.notes,
    });

    const reservationId = await this.reservationRepository.save(reservation);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.RESERVATION_CREATED,
        AuditEntityType.RESERVATION,
        reservationId,
        {
          unitId: command.unitId,
          guestId: command.guestId,
          checkIn: command.checkIn.toISOString(),
          checkOut: command.checkOut.toISOString(),
          source: command.source,
        },
      ),
    );

    return new CreateReservationResult(reservationId);
  }
}
