import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetGuestBookingsQuery } from './get-guest-bookings.query';
import {
  GetGuestBookingsResult,
  GuestBookingDto,
} from './get-guest-bookings.result';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@QueryHandler(GetGuestBookingsQuery)
export class GetGuestBookingsHandler implements IQueryHandler<
  GetGuestBookingsQuery,
  GetGuestBookingsResult
> {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
  ) {}

  async execute(query: GetGuestBookingsQuery): Promise<GetGuestBookingsResult> {
    const tenantId = query.tenantId;
    let guestId: GuestId;

    try {
      guestId = GuestId.createFromString(query.guestId);
    } catch {
      return new GetGuestBookingsResult([], 0, query.page, query.limit);
    }

    const tenant = TenantId.createFromString(tenantId);

    const [reservations, total, properties, units] = await Promise.all([
      this.reservationRepository.findByGuestId(
        tenantId,
        guestId.toString(),
        query.page,
        query.limit,
        query.sortBy,
        query.sortDirection,
      ),
      this.reservationRepository.countByGuestId(tenantId, guestId.toString()),
      this.propertyRepository.findByTenantId(tenant),
      this.unitRepository.findByTenantId(tenant),
    ]);

    const propertyNames = new Map(
      properties.map((property) => [
        property.getId()?.toString(),
        property.getName(),
      ]),
    );
    const unitNames = new Map(
      units.map((unit) => [unit.getId()?.toString(), unit.getName()]),
    );

    const items: GuestBookingDto[] = reservations.map((res) => {
      const propertyId = res.getPropertyId().toString();
      const unitId = res.getUnitId().toString();
      const unit = units.find((item) => item.getId()?.toString() === unitId);
      const resolvedPropertyId = propertyNames.has(propertyId)
        ? propertyId
        : (unit?.getPropertyId().toString() ?? propertyId);

      return {
        id: res.getId()!.toString(),
        propertyId: resolvedPropertyId,
        propertyName: propertyNames.get(resolvedPropertyId) ?? null,
        unitId,
        unitName: unitNames.get(unitId) ?? null,
        checkIn: res.getDateRange().getCheckIn(),
        checkOut: res.getDateRange().getCheckOut(),
        status: res.getStatus().toString(),
        totalAmount: res.getTotalPrice(),
        source: res.getSource().toString(),
        createdAt: res.getCreatedAt(),
        nights: res.getDateRange().nights(),
        guestsCount: res.getGuestsCount(),
        notes: res.getNotes(),
        cancelledAt: res.getCancelledAt(),
        cancellationReason: res.getCancellationReason(),
        checkInActualAt: res.getCheckInActualAt(),
        checkOutActualAt: res.getCheckOutActualAt(),
      };
    });

    return new GetGuestBookingsResult(items, total, query.page, query.limit);
  }
}
