import { NotFoundException } from '@nestjs/common';
import { GetUnitRatingsHandler } from '@/application/unit-rating/queries/get-unit-ratings/get-unit-ratings.handler';
import { GetUnitRatingsQuery } from '@/application/unit-rating/queries/get-unit-ratings/get-unit-ratings.query';
import { UnitRatingRepository } from '@/domain/unit-rating/repositories/unit-rating.repository';
import { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { createUnitRatingRepositoryMock } from '@test/shared/mocks/repositories/unit-rating-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import { makeUnitRating, UNIT_RATING_FIXTURE_DEFAULTS } from '@test/shared/fixtures/unit-rating.fixture';
import { makeGuest } from '@test/shared/fixtures/guest.fixture';
import { Unit } from '@/domain/unit/entities/unit.entity';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';

const TENANT_ID = UNIT_RATING_FIXTURE_DEFAULTS.tenantId;
const UNIT_ID = UNIT_RATING_FIXTURE_DEFAULTS.unitId;
const GUEST_ID = UNIT_RATING_FIXTURE_DEFAULTS.guestId;

function makeUnitFixture(overrides?: Partial<{ tenantId: string }>): Unit {
  return Unit.reconstitute({
    id: UnitId.create(UNIT_ID),
    tenantId: TenantId.createFromString(overrides?.tenantId ?? TENANT_ID),
    propertyId: PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c900000000'),
    basicInfo: { name: 'Test Unit', description: 'Desc' },
    inventoryConfig: { inventoryCount: 1 },
    capacityConfig: { maxGuests: 2, standardGuests: 2 },
    physicalFeatures: { bedrooms: [], bathroomsCount: 1, isShared: false },
    pricingConfig: { pricePerNight: 80 },
    amenities: [],
    externalIds: ExternalIds.create(),
    timestamps: { createdAt: new Date(), updatedAt: new Date() },
  });
}

describe('GetUnitRatingsHandler', () => {
  let handler: GetUnitRatingsHandler;
  let unitRatingRepository: jest.Mocked<UnitRatingRepository>;
  let unitRepository: jest.Mocked<UnitRepository>;
  let guestRepository: jest.Mocked<GuestRepository>;

  beforeEach(() => {
    unitRatingRepository = createUnitRatingRepositoryMock();
    unitRepository = createUnitRepositoryMock();
    guestRepository = createGuestRepositoryMock();
    handler = new GetUnitRatingsHandler(unitRatingRepository, unitRepository, guestRepository);
  });

  it('returns paginated ratings with guest name for a valid unit', async () => {
    const rating = makeUnitRating();
    const guest = makeGuest({ id: GUEST_ID, fullName: 'John Doe' });
    unitRepository.findById.mockResolvedValue(makeUnitFixture());
    unitRatingRepository.findByUnitIdPaginated.mockResolvedValue({
      ratings: [rating],
      total: 1,
    });
    guestRepository.findById.mockResolvedValue(guest);

    const result = await handler.execute(
      new GetUnitRatingsQuery(TENANT_ID, UNIT_ID, 1, 20),
    );

    expect(result.total).toBe(1);
    expect(result.ratings).toHaveLength(1);
    expect(result.ratings[0].rate).toBe(4);
    expect(result.ratings[0].guestName).toBe('John Doe');
    expect(result.totalPages).toBe(1);
  });

  it('returns "Unknown" as guest name when guest is not found', async () => {
    const rating = makeUnitRating();
    unitRepository.findById.mockResolvedValue(makeUnitFixture());
    unitRatingRepository.findByUnitIdPaginated.mockResolvedValue({
      ratings: [rating],
      total: 1,
    });
    guestRepository.findById.mockResolvedValue(null);

    const result = await handler.execute(
      new GetUnitRatingsQuery(TENANT_ID, UNIT_ID, 1, 20),
    );

    expect(result.ratings[0].guestName).toBe('Unknown');
  });

  it('throws NotFoundException when unit does not exist', async () => {
    unitRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new GetUnitRatingsQuery(TENANT_ID, UNIT_ID, 1, 20)),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when unit belongs to different tenant', async () => {
    unitRepository.findById.mockResolvedValue(
      makeUnitFixture({ tenantId: 'other-tenant-000000000001' }),
    );

    await expect(
      handler.execute(new GetUnitRatingsQuery(TENANT_ID, UNIT_ID, 1, 20)),
    ).rejects.toThrow(NotFoundException);
  });
});
