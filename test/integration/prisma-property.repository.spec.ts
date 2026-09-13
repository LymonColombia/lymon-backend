import { PrismaPropertyRepository } from '@/infrastructure/persistence/repositories/prisma-property.repository';
import { PrismaTransactionManager } from '@/infrastructure/persistence/transaction/prisma-transaction-manager';
import { Property } from '@/domain/property/entities/property.entity';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { PropertyType } from '@/domain/property/value-objects/property-type.vo';
import { CancellationPolicy } from '@/domain/property/value-objects/cancellation-policy.vo';
import { Location } from '@/domain/property/value-objects/location.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedTenant } from './fixtures';

describe('PrismaPropertyRepository', () => {
  const repo = new PrismaPropertyRepository(prisma);

  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newProperty = (name = 'Playa Norte') =>
    Property.create({
      tenantId: TenantId.createFromString(tenantId),
      name,
      description: 'On the beach',
      propertyType: PropertyType.create('HOTEL'),
      address: 'Calle 1',
      city: 'Cartagena',
      state: 'Bolivar',
      country: 'CO',
      zipCode: '130001',
      location: Location.create(10.391, -75.4794),
      checkInTime: '15:00',
      checkOutTime: '11:00',
      cancellationPolicy: CancellationPolicy.create('FLEXIBLE'),
      hostPhone: '+573001112233',
      hostEmail: 'host@costa.com',
    });

  it('returns the new id from save and round-trips every field', async () => {
    const id = await repo.save(newProperty());
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    const found = (await repo.findById(PropertyId.create(id)))!;
    expect(found.getName()).toBe('Playa Norte');
    expect(found.getCheckInTime()).toBe('15:00');
    expect(found.getCheckOutTime()).toBe('11:00');
    expect(found.getLocation().getLat()).toBeCloseTo(10.391, 6);
    expect(found.getLocation().getLng()).toBeCloseTo(-75.4794, 6);
    expect(found.getPropertyType().toString()).toBe('HOTEL');
    expect(found.getCancellationPolicy().toString()).toBe('FLEXIBLE');
    expect(found.getImageKey()).toBeNull();
  });

  it('gives same-named properties distinct slugs and re-slugs on rename', async () => {
    const first = await repo.save(newProperty());
    const second = await repo.save(newProperty());

    const slugs = await prisma.properties.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, slug: true },
    });
    expect(new Set(slugs.map((row) => row.slug)).size).toBe(2);
    expect(slugs.every((row) => row.slug.startsWith('playa-norte-'))).toBe(true);

    const before = slugs.find((row) => row.id === first)!.slug;
    const loaded = (await repo.findById(PropertyId.create(first)))!;
    loaded.updateDetails({ name: 'Playa Sur' });
    await repo.save(loaded);

    const after = (await prisma.properties.findUnique({
      where: { id: first },
      select: { slug: true },
    }))!.slug;
    expect(after).not.toBe(before);
    expect(after).toMatch(/^playa-sur-/);
    expect(second).not.toBe(first);
  });

  it('updates in place and keeps the same id', async () => {
    const id = await repo.save(newProperty());
    const loaded = (await repo.findById(PropertyId.create(id)))!;

    loaded.updateDetails({ name: 'Playa Sur' });
    loaded.updateCheckInOut('14:30', '10:00');
    const sameId = await repo.save(loaded);

    expect(sameId).toBe(id);
    expect(await prisma.properties.count()).toBe(1);
    const reloaded = (await repo.findById(PropertyId.create(id)))!;
    expect(reloaded.getName()).toBe('Playa Sur');
    expect(reloaded.getCheckInTime()).toBe('14:30');
    expect(reloaded.getCheckOutTime()).toBe('10:00');
  });

  it('finds by tenant + slug and counts only live rows', async () => {
    const id = await repo.save(newProperty());
    const created = (await prisma.properties.findUnique({ where: { id } }))!;

    expect(
      await repo.findByTenantIdAndSlug(
        TenantId.createFromString(tenantId),
        created.slug,
      ),
    ).not.toBeNull();
    expect(await repo.countByTenantId(TenantId.createFromString(tenantId))).toBe(1);

    await repo.delete(PropertyId.create(id));

    expect(await repo.findById(PropertyId.create(id))).toBeNull();
    expect(
      await repo.findByTenantIdAndSlug(
        TenantId.createFromString(tenantId),
        created.slug,
      ),
    ).toBeNull();
    expect(await repo.countByTenantId(TenantId.createFromString(tenantId))).toBe(0);
    expect(await repo.findByTenantId(TenantId.createFromString(tenantId))).toEqual([]);
  });

  it('participates in a transaction and rolls back with it', async () => {
    const manager = new PrismaTransactionManager(prisma);

    await expect(
      manager.executeInTransaction(async (context) => {
        await repo.save(newProperty(), context.getContext());
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await prisma.properties.count()).toBe(0);
  });
});
