import { GetGuestBookingsHandler } from '@/application/guest/queries/get-guest-bookings/get-guest-bookings.handler';
import { GetGuestBookingsQuery } from '@/application/guest/queries/get-guest-bookings/get-guest-bookings.query';
import { ReservationSourceEnum } from '@/domain/reservation/value-objects/reservation-source.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { Property } from '@/domain/property/entities/property.entity';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { Unit } from '@/domain/unit/entities/unit.entity';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { makeReservation } from '@test/shared/fixtures/reservation.fixture';
import { makeProperty } from '@test/shared/fixtures/property.fixture';

describe('GetGuestBookingsHandler', () => {
  let handler: GetGuestBookingsHandler;
  let reservationRepository: ReturnType<typeof createReservationRepositoryMock>;
  let propertyRepository: ReturnType<typeof createPropertyRepositoryMock>;
  let unitRepository: ReturnType<typeof createUnitRepositoryMock>;

  const tenantId = '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000';
  const guestId = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
  const propertyId = '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000';
  const unitId = '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000';

  beforeEach(() => {
    reservationRepository = createReservationRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();
    unitRepository = createUnitRepositoryMock();

    handler = new GetGuestBookingsHandler(
      reservationRepository,
      propertyRepository,
      unitRepository,
    );
  });

  function makeUnit(overrides?: {
    id?: string;
    tenantId?: string;
    propertyId?: string;
    name?: string;
  }): Unit {
    return Unit.reconstitute({
      id: UnitId.create(overrides?.id ?? unitId),
      tenantId: TenantId.createFromString(overrides?.tenantId ?? tenantId),
      propertyId: PropertyId.create(overrides?.propertyId ?? propertyId),
      basicInfo: {
        name: overrides?.name ?? 'Ocean View Suite',
        description: 'Spacious room',
      },
      inventoryConfig: {
        inventoryCount: 1,
      },
      capacityConfig: {
        maxGuests: 4,
        standardGuests: 2,
      },
      physicalFeatures: {
        bedrooms: [],
        bathroomsCount: 1,
        isShared: false,
      },
      pricingConfig: {
        pricePerNight: 180,
      },
      amenities: [],
      externalIds: ExternalIds.create(),
      timestamps: {
        createdAt: new Date('2030-01-01T10:00:00Z'),
        updatedAt: new Date('2030-01-01T10:00:00Z'),
      },
    });
  }

  function mockTenantCatalog(
    properties: Property[] = [makeProperty({ id: propertyId, tenantId })],
    units: Unit[] = [makeUnit()],
  ) {
    propertyRepository.findByTenantId.mockResolvedValue(properties);
    unitRepository.findByTenantId.mockResolvedValue(units);
  }

  describe('UT-01: Correct mapping of entity to enriched DTO', () => {
    it('should map reservation entity to enriched DTO correctly', async () => {
      const reservation = makeReservation({
        tenantId,
        guestId,
        propertyId,
        unitId,
        totalPrice: 450.5,
        status: ReservationStatusEnum.CONFIRMED,
        source: ReservationSourceEnum.AIRBNB,
      });
      reservationRepository.findByGuestId.mockResolvedValue([reservation]);
      reservationRepository.countByGuestId.mockResolvedValue(1);
      mockTenantCatalog();

      const query = new GetGuestBookingsQuery(tenantId, guestId);
      const result = await handler.execute(query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: reservation.getId()!.toString(),
        propertyId,
        propertyName: 'Casa del lago',
        unitId,
        unitName: 'Ocean View Suite',
        status: ReservationStatusEnum.CONFIRMED,
        totalAmount: 450.5,
        source: ReservationSourceEnum.AIRBNB,
        nights: 4,
        guestsCount: 2,
        notes: null,
        cancelledAt: null,
        cancellationReason: null,
        checkInActualAt: null,
        checkOutActualAt: null,
      });
    });
  });

  describe('UT-02: Strict tenant filtering', () => {
    it('should only return bookings belonging to the requested tenant', async () => {
      const resA = makeReservation({ tenantId, guestId, propertyId, unitId });
      reservationRepository.findByGuestId.mockResolvedValue([resA]);
      reservationRepository.countByGuestId.mockResolvedValue(1);
      mockTenantCatalog();

      const query = new GetGuestBookingsQuery(tenantId, guestId);
      const result = await handler.execute(query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(resA.getId()!.toString());
    });
  });

  describe('UT-03: Invalid GuestId handling', () => {
    it('should return empty list if guestId format is invalid', async () => {
      const query = new GetGuestBookingsQuery(tenantId, 'invalid-guest-id');
      const result = await handler.execute(query);

      expect(result.items).toEqual([]);
      expect(reservationRepository.findByGuestId).not.toHaveBeenCalled();
      expect(propertyRepository.findByTenantId).not.toHaveBeenCalled();
      expect(unitRepository.findByTenantId).not.toHaveBeenCalled();
    });
  });

  describe('UT-04: Empty list when there are no reservations', () => {
    it('should return empty list if no bookings are found', async () => {
      reservationRepository.findByGuestId.mockResolvedValue([]);
      reservationRepository.countByGuestId.mockResolvedValue(0);
      mockTenantCatalog();

      const query = new GetGuestBookingsQuery(tenantId, guestId);
      const result = await handler.execute(query);

      expect(result.items).toEqual([]);
    });
  });

  describe('UT-05: Descending order by creation date', () => {
    it('should return bookings sorted by creation date descending', async () => {
      const resJan = makeReservation({
        id: '65f1a1a2-b3c4-d5e6-f7a8-b91100000000',
        tenantId,
        guestId,
        propertyId,
        unitId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });
      const resMay = makeReservation({
        id: '65f1a1a2-b3c4-d5e6-f7a8-b92200000000',
        tenantId,
        guestId,
        propertyId,
        unitId,
        createdAt: new Date('2024-05-01T00:00:00Z'),
      });
      reservationRepository.findByGuestId.mockResolvedValue([resMay, resJan]);
      reservationRepository.countByGuestId.mockResolvedValue(2);
      mockTenantCatalog();

      const query = new GetGuestBookingsQuery(tenantId, guestId);
      const result = await handler.execute(query);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('65f1a1a2-b3c4-d5e6-f7a8-b92200000000');
      expect(result.items[1].id).toBe('65f1a1a2-b3c4-d5e6-f7a8-b91100000000');
    });
  });

  describe('UT-06: Fallback to the unit propertyId', () => {
    it('should resolve propertyName from unit property when reservation propertyId is stale', async () => {
      const stalePropertyId = '65f1a1a2-b3c4-d5e6-f7a8-b9d900000000';
      const reservation = makeReservation({
        tenantId,
        guestId,
        propertyId: stalePropertyId,
        unitId,
      });
      reservationRepository.findByGuestId.mockResolvedValue([reservation]);
      reservationRepository.countByGuestId.mockResolvedValue(1);
      mockTenantCatalog(
        [makeProperty({ id: propertyId, tenantId })],
        [
          makeUnit({
            id: unitId,
            tenantId,
            propertyId,
            name: 'Ocean View Suite',
          }),
        ],
      );

      const query = new GetGuestBookingsQuery(tenantId, guestId);
      const result = await handler.execute(query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].propertyId).toBe(propertyId);
      expect(result.items[0].propertyName).toBe('Casa del lago');
    });
  });
});
