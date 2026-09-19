import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGuestReservationsQuery } from './get-guest-reservations.query';
import {
  GetGuestReservationsResult,
  GuestReservationListItemDto,
} from './get-guest-reservations.result';
import {
  GUEST_RESERVATIONS_READ_REPOSITORY,
  type GuestReservationsReadRepository,
} from '@/domain/reservation/repositories/guest-reservations-read.repository';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@QueryHandler(GetGuestReservationsQuery)
export class GetGuestReservationsHandler implements IQueryHandler<
  GetGuestReservationsQuery,
  GetGuestReservationsResult
> {
  constructor(
    @Inject(GUEST_RESERVATIONS_READ_REPOSITORY)
    private readonly guestReservationsReadRepository: GuestReservationsReadRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
  ) {}

  async execute(
    query: GetGuestReservationsQuery,
  ): Promise<GetGuestReservationsResult> {
    const guestAccountId = GuestAccountId.createFromString(
      query.guestAccountId,
    );
    const guestRecords: Guest[] =
      await this.guestRepository.findAllByGuestAccountId(guestAccountId);

    const guestIds: string[] = guestRecords
      .map((guest) => guest.getId()?.toString())
      .filter((id): id is string => Boolean(id));

    if (guestIds.length === 0) {
      return new GetGuestReservationsResult([], 0, query.page, query.limit);
    }

    const [reservations, total] = await Promise.all([
      this.guestReservationsReadRepository.findByGuestIds(guestIds, {
        statuses: query.statuses,
        fromDate: query.fromDate,
        toDate: query.toDate,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        page: query.page,
        limit: query.limit,
      }),
      this.guestReservationsReadRepository.countByGuestIds(guestIds, {
        statuses: query.statuses,
        fromDate: query.fromDate,
        toDate: query.toDate,
      }),
    ]);

    const tenantIds = [
      ...new Set(guestRecords.map((g) => g.getTenantId().toString())),
    ];

    const [propertiesByTenant, unitsByTenant] = await Promise.all([
      Promise.all(
        tenantIds.map((tenantId) =>
          this.propertyRepository.findByTenantId(
            TenantId.createFromString(tenantId),
          ),
        ),
      ),
      Promise.all(
        tenantIds.map((tenantId) =>
          this.unitRepository.findByTenantId(
            TenantId.createFromString(tenantId),
          ),
        ),
      ),
    ]);

    const propertyNames = new Map<string, string>();
    const unitNames = new Map<string, string>();

    propertiesByTenant.flat().forEach((property) => {
      propertyNames.set(property.getId()!.toString(), property.getName());
    });

    unitsByTenant.flat().forEach((unit) => {
      unitNames.set(unit.getId()!.toString(), unit.getName());
    });

    const items: GuestReservationListItemDto[] = reservations.map(
      (reservation) => {
        const id = reservation.getId()!.toString();
        const propertyId = reservation.getPropertyId().toString();
        const unitId = reservation.getUnitId().toString();
        const unitName = unitNames.get(unitId) ?? null;
        const propertyName = propertyNames.get(propertyId) ?? null;

        return {
          id,
          bookingReference: String(reservation.getReservationNumber() ?? id),
          propertyId,
          propertyName,
          unitId,
          unitName,
          serviceName: unitName ?? propertyName ?? 'Reservation',
          checkIn: reservation.getDateRange().getCheckIn(),
          checkOut: reservation.getDateRange().getCheckOut(),
          status: reservation.getStatus().getValue(),
        };
      },
    );

    return new GetGuestReservationsResult(
      items,
      total,
      query.page,
      query.limit,
    );
  }
}
