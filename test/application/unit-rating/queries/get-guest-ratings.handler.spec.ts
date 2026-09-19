import { GetGuestRatingsHandler } from '@/application/unit-rating/queries/get-guest-ratings/get-guest-ratings.handler';
import { GetGuestRatingsQuery } from '@/application/unit-rating/queries/get-guest-ratings/get-guest-ratings.query';
import { UnitRatingRepository } from '@/domain/unit-rating/repositories/unit-rating.repository';
import { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { createUnitRatingRepositoryMock } from '@test/shared/mocks/repositories/unit-rating-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { makeUnitRating, UNIT_RATING_FIXTURE_DEFAULTS } from '@test/shared/fixtures/unit-rating.fixture';
import { Unit } from '@/domain/unit/entities/unit.entity';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';

const GUEST_ID = UNIT_RATING_FIXTURE_DEFAULTS.guestId;
const TENANT_ID = UNIT_RATING_FIXTURE_DEFAULTS.tenantId;
const UNIT_ID = UNIT_RATING_FIXTURE_DEFAULTS.unitId;

function makeUnitFixture(name = 'Casa del Mar'): Unit {
  return Unit.reconstitute({
    id: UnitId.create(UNIT_ID),
    tenantId: TenantId.createFromString(TENANT_ID),
    propertyId: PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c900000000'),
    basicInfo: { name, description: 'Desc' },
    inventoryConfig: { inventoryCount: 1 },
    capacityConfig: { maxGuests: 2, standardGuests: 2 },
    physicalFeatures: { bedrooms: [], bathroomsCount: 1, isShared: false },
    pricingConfig: { pricePerNight: 80 },
    amenities: [],
    externalIds: ExternalIds.create(),
    timestamps: { createdAt: new Date(), updatedAt: new Date() },
  });
}

describe('GetGuestRatingsHandler', () => {
  let handler: GetGuestRatingsHandler;
  let unitRatingRepository: jest.Mocked<UnitRatingRepository>;
  let unitRepository: jest.Mocked<UnitRepository>;

  beforeEach(() => {
    unitRatingRepository = createUnitRatingRepositoryMock();
    unitRepository = createUnitRepositoryMock();
    handler = new GetGuestRatingsHandler(unitRatingRepository, unitRepository);
  });

  it('returns paginated ratings with unit names and average', async () => {
    const rating = makeUnitRating();
    unitRatingRepository.findByGuestIdPaginated.mockResolvedValue({
      ratings: [rating],
      total: 1,
    });
    unitRatingRepository.calculateAverageForGuest.mockResolvedValue(4);
    unitRepository.findById.mockResolvedValue(makeUnitFixture('Casa del Mar'));

    const result = await handler.execute(
      new GetGuestRatingsQuery(TENANT_ID, GUEST_ID, 1, 20),
    );

    expect(result.total).toBe(1);
    expect(result.ratings).toHaveLength(1);
    expect(result.ratings[0].unitName).toBe('Casa del Mar');
    expect(result.ratings[0].rate).toBe(4);
    expect(result.ratings[0].message).toBe('Great unit!');
    expect(result.averageRating).toBe(4);
    expect(result.totalPages).toBe(1);
  });

  it('returns empty list and null average when guest has no ratings', async () => {
    unitRatingRepository.findByGuestIdPaginated.mockResolvedValue({
      ratings: [],
      total: 0,
    });
    unitRatingRepository.calculateAverageForGuest.mockResolvedValue(null);

    const result = await handler.execute(
      new GetGuestRatingsQuery(TENANT_ID, GUEST_ID, 1, 20),
    );

    expect(result.ratings).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.averageRating).toBeNull();
    expect(result.totalPages).toBe(0);
  });

  it('falls back to "Unknown" unit name when unit is not found', async () => {
    const rating = makeUnitRating();
    unitRatingRepository.findByGuestIdPaginated.mockResolvedValue({
      ratings: [rating],
      total: 1,
    });
    unitRatingRepository.calculateAverageForGuest.mockResolvedValue(4);
    unitRepository.findById.mockResolvedValue(null);

    const result = await handler.execute(
      new GetGuestRatingsQuery(TENANT_ID, GUEST_ID, 1, 20),
    );

    expect(result.ratings[0].unitName).toBe('Unknown');
  });

  it('computes correct totalPages for multi-page result', async () => {
    unitRatingRepository.findByGuestIdPaginated.mockResolvedValue({
      ratings: [],
      total: 45,
    });
    unitRatingRepository.calculateAverageForGuest.mockResolvedValue(3.5);

    const result = await handler.execute(
      new GetGuestRatingsQuery(TENANT_ID, GUEST_ID, 1, 20),
    );

    expect(result.totalPages).toBe(3);
  });
});
