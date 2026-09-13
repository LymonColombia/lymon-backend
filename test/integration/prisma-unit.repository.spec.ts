import { PrismaUnitRepository } from '@/infrastructure/persistence/repositories/prisma-unit.repository';
import { Unit } from '@/domain/unit/entities/unit.entity';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';
import { BedTypeEnum } from '@/domain/unit/value-objects/bed-type.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedProperty, seedTenant } from './fixtures';

describe('PrismaUnitRepository', () => {
  const repo = new PrismaUnitRepository(prisma);

  let tenantId: string;
  let propertyId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    propertyId = (await seedProperty(tenantId)).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newUnit = (
    name = 'Suite 101',
    overrides: { maxGuests?: number; pricePerNight?: number } = {},
  ) =>
    Unit.create({
      tenantId: TenantId.createFromString(tenantId),
      propertyId: PropertyId.create(propertyId),
      basicInfo: { name, description: 'Sea view' },
      inventoryConfig: { inventoryCount: 3 },
      capacityConfig: {
        maxGuests: overrides.maxGuests ?? 4,
        standardGuests: 2,
      },
      physicalFeatures: {
        bedrooms: [{ roomName: 'Main', beds: [{ type: BedTypeEnum.KING, count: 1 }] }],
        bathroomsCount: 1,
        isShared: true,
      },
      pricingConfig: { pricePerNight: overrides.pricePerNight ?? 250000 },
      amenities: ['wifi', 'pool'],
      externalIds: ExternalIds.create('air-1', undefined, 'vrbo-1'),
    });

  it('round-trips jsonb bedrooms, arrays, is_shared and the flattened external ids', async () => {
    const id = await repo.save(newUnit());

    const found = (await repo.findById(UnitId.create(id)))!;
    expect(found.getName()).toBe('Suite 101');
    expect(found.getIsShared()).toBe(true);
    expect(found.getAmenities()).toEqual(['wifi', 'pool']);
    expect(found.getMediaKeys()).toEqual([]);
    expect(found.getBedrooms()).toEqual([
      { roomName: 'Main', beds: [{ type: BedTypeEnum.KING, count: 1 }] },
    ]);
    expect(found.getPricePerNight()).toBe(250000);
    expect(found.getRating()).toBeNull();
    expect(found.getExternalIds().getAirbnbId()).toBe('air-1');
    expect(found.getExternalIds().getBookingId()).toBeUndefined();
    expect(found.getExternalIds().getVrboId()).toBe('vrbo-1');
  });

  it('filters by minGuests and property, and paginates', async () => {
    await repo.save(newUnit('Small', { maxGuests: 2 }));
    await repo.save(newUnit('Large', { maxGuests: 8 }));

    const tenant = TenantId.createFromString(tenantId);
    expect((await repo.findByTenantIdPaginated(tenant, 1, 10)).total).toBe(2);
    expect((await repo.findByTenantIdPaginated(tenant, 1, 10, 5)).total).toBe(1);
    expect(
      (await repo.findByTenantIdPaginated(tenant, 1, 10, undefined, propertyId)).total,
    ).toBe(2);

    const firstPage = await repo.findByTenantIdPaginated(tenant, 1, 1);
    expect(firstPage.units).toHaveLength(1);
    expect(firstPage.total).toBe(2);
  });

  it('sorts by price and matches names literally, case-insensitively', async () => {
    await repo.save(newUnit('Cheap Room', { pricePerNight: 100 }));
    await repo.save(newUnit('Pricey Room', { pricePerNight: 900 }));

    const asc = await repo.findAllPaginated(1, 10, undefined, undefined, 'asc');
    expect(asc.units.map((unit) => unit.getName())).toEqual([
      'Cheap Room',
      'Pricey Room',
    ]);

    const desc = await repo.findAllPaginated(1, 10, undefined, undefined, 'desc');
    expect(desc.units[0].getName()).toBe('Pricey Room');

    const byName = await repo.findAllPaginated(1, 10, undefined, undefined, undefined, 'cheap');
    expect(byName.total).toBe(1);

    // a regex metacharacter must not be interpreted
    const literal = await repo.findAllPaginated(1, 10, undefined, undefined, undefined, 'Cheap.Room');
    expect(literal.total).toBe(0);
  });

  it('hides soft-deleted units from every read', async () => {
    const id = await repo.save(newUnit());
    await repo.delete(UnitId.create(id));

    const tenant = TenantId.createFromString(tenantId);
    expect(await repo.findById(UnitId.create(id))).toBeNull();
    expect(await repo.findByPropertyId(PropertyId.create(propertyId))).toEqual([]);
    expect(await repo.findByTenantId(tenant)).toEqual([]);
    expect(await repo.countByTenantId(tenant)).toBe(0);
    expect(await repo.findByIds([UnitId.create(id)])).toEqual([]);
  });

  it('returns an empty list for findByIds([])', async () => {
    expect(await repo.findByIds([])).toEqual([]);
  });
});
