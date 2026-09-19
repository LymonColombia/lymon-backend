import { GetReservationsByTenantHandler } from '@/application/reservation/queries/get-reservations-by-tenant/get-reservations-by-tenant.query-handler';
import { GetReservationsByTenantQuery } from '@/application/reservation/queries/get-reservations-by-tenant/get-reservations-by-tenant.query';
import { GetReservationsByTenantResult } from '@/application/reservation/queries/get-reservations-by-tenant/get-reservations-by-tenant.result';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import {
  ReservationSource,
  ReservationSourceEnum,
} from '@/domain/reservation/value-objects/reservation-source.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

describe('GetReservationsByTenantHandler', () => {
  let handler: GetReservationsByTenantHandler;
  let reservationRepository: ReturnType<typeof createReservationRepositoryMock>;

  beforeEach(() => {
    reservationRepository = createReservationRepositoryMock();
    handler = new GetReservationsByTenantHandler(reservationRepository as any);
  });

  it('returns paginated reservations for tenant', async () => {
    const r1 = Reservation.createConfirmed({
      tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      propertyId: PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000'),
      unitId: UnitId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c800000000'),
      guestId: GuestId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9d100000000'),
      dateRange: DateRange.create(
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      ),
      source: ReservationSource.create(ReservationSourceEnum.DIRECT),
      guestsCount: 1,
      pricePerNight: 100,
    });
    r1.setId(ReservationId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c300000000'));

    const r2 = Reservation.createConfirmed({
      tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      propertyId: PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000'),
      unitId: UnitId.create('65f1a1a2-b3c4-d5e6-f7a8-b9cf00000000'),
      guestId: GuestId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9d200000000'),
      dateRange: DateRange.create(
        new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      ),
      source: ReservationSource.create(ReservationSourceEnum.DIRECT),
      guestsCount: 1,
      pricePerNight: 100,
    });
    r2.setId(ReservationId.create('res-2'));

    // mock repository returns already-paginated results
    reservationRepository.findByTenantId.mockResolvedValue([r1, r2] as any);
    reservationRepository.countByTenantId.mockResolvedValue(3 as any);

    const result = await handler.execute(
      new GetReservationsByTenantQuery('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000', 1, 2),
    );

    expect(result).toBeInstanceOf(GetReservationsByTenantResult);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
  });

  it("doesn't return tenant-2 reservations when queried by tenant-1", async () => {
    const r1 = Reservation.createConfirmed({
      tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      propertyId: PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000'),
      unitId: UnitId.create('unit-3'),
      guestId: GuestId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9d300000000'),
      dateRange: DateRange.create(
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      ),
      source: ReservationSource.create(ReservationSourceEnum.DIRECT),
      guestsCount: 1,
      pricePerNight: 100,
    });
    r1.setId(ReservationId.create('res-3'));

    const r2 = Reservation.createConfirmed({
      tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c900000000'),
      propertyId: PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9cd00000000'),
      unitId: UnitId.create('unit-4'),
      guestId: GuestId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9d400000000'),
      dateRange: DateRange.create(
        new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      ),
      source: ReservationSource.create(ReservationSourceEnum.DIRECT),
      guestsCount: 1,
      pricePerNight: 100,
    });
    r2.setId(ReservationId.create('res-4'));

    reservationRepository.findByTenantId.mockImplementation((tenantId) => {
      return Promise.resolve(
        tenantId === '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000' ? [r1] : [r2],
      );
    });
    reservationRepository.countByTenantId.mockImplementation((tenantId) => {
      return Promise.resolve(tenantId === '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000' ? 1 : 1);
    });

    const result = await handler.execute(
      new GetReservationsByTenantQuery('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000', 1, 10),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].tenantId).toBe('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
  });
});
