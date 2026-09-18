import {
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateGuestReservationCommand } from './create-guest-reservation.command';
import { CreateReservationResult } from '../create-reservation/create-reservation.result';
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
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import {
  ReservationSource,
  ReservationSourceEnum,
} from '@/domain/reservation/value-objects/reservation-source.vo';
import { AvailabilityChecker } from '@/domain/reservation/services/availability-checker.domain-service';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';

@CommandHandler(CreateGuestReservationCommand)
export class CreateGuestReservationHandler implements ICommandHandler<CreateGuestReservationCommand> {
  private readonly logger = new Logger(CreateGuestReservationHandler.name);

  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: CreateGuestReservationCommand,
  ): Promise<CreateReservationResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const guestAccountId = GuestAccountId.createFromString(
      command.guestAccountId,
    );

    const guestId = await this.resolveGuestId(
      tenantId,
      guestAccountId,
      command.actorEmail,
    );

    const unitId = UnitId.create(command.unitId);
    const unit = await this.unitRepository.findById(unitId);
    if (!unit) {
      throw new NotFoundException('Unit not found');
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
        'Unit is not available for the requested dates',
      );
    }

    const reservation = Reservation.create({
      tenantId,
      propertyId: PropertyId.create(command.propertyId),
      unitId,
      guestId,
      dateRange,
      source: ReservationSource.create(ReservationSourceEnum.DIRECT),
      guestsCount: command.guestsCount,
      pricePerNight: unit.getPricePerNight(),
      notes: command.notes,
    });

    const reservationId = await this.reservationRepository.save(reservation);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.guestAccountId,
        command.actorEmail,
        AuditAction.RESERVATION_CREATED,
        AuditEntityType.RESERVATION,
        reservationId,
        {
          unitId: command.unitId,
          guestId: guestId.toString(),
          checkIn: command.checkIn.toISOString(),
          checkOut: command.checkOut.toISOString(),
          source: ReservationSourceEnum.DIRECT,
        },
      ),
    );

    return new CreateReservationResult(reservationId);
  }

  /**
   * Returns the GuestId for the reservation.
   * If a Guest CRM profile already exists for this tenant+guestAccount, reuses it.
   * Otherwise, creates a new Guest profile from the GuestAccount data.
   */
  private async resolveGuestId(
    tenantId: TenantId,
    guestAccountId: GuestAccountId,
    actorEmail: string,
  ): Promise<GuestId> {
    const existing = await this.guestRepository.findByGuestAccountId(
      tenantId,
      guestAccountId,
    );
    if (existing) {
      return existing.getId()!;
    }

    const account = await this.guestAccountRepository.findById(guestAccountId);
    if (!account) {
      throw new NotFoundException('Guest account not found');
    }

    const newProfile = Guest.create({
      tenantId,
      guestAccountId,
      fullName: account.getFullName(),
      firstName: account.getFirstName() ?? undefined,
      lastName: account.getLastName() ?? undefined,
      primaryEmail: actorEmail,
      identity: {},
    });

    const savedId = await this.guestRepository.save(newProfile);
    this.logger.log(
      `Auto-provisioned Guest profile ${savedId} for guestAccountId=${guestAccountId.toString()} in tenant=${tenantId.toString()}`,
    );

    return GuestId.createFromString(savedId);
  }
}
