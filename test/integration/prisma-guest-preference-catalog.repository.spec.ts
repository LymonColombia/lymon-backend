import { PrismaGuestPreferenceCatalogRepository } from '@/infrastructure/persistence/repositories/prisma-guest-preference-catalog.repository';
import {
  GuestPreferenceCatalogItem,
  GuestPreferenceSourceEnum,
} from '@/domain/guest-preference/entities/guest-preference-catalog-item.entity';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedTenant } from './fixtures';

describe('PrismaGuestPreferenceCatalogRepository', () => {
  const repo = new PrismaGuestPreferenceCatalogRepository(prisma);

  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const customItem = (label: string) =>
    GuestPreferenceCatalogItem.create({
      tenantId: TenantId.createFromString(tenantId),
      category: GuestPreferenceCategoryEnum.DIETARY,
      source: GuestPreferenceSourceEnum.CUSTOM,
      label,
    });

  it('returns the generated id from save and round-trips a custom item', async () => {
    const id = await repo.save(customItem('Gluten free'));

    const found = (await repo.findById(id))!;
    expect(found.getLabel()).toBe('Gluten free');
    expect(found.getKey()).toBeNull();
    expect(found.getCategory()).toBe(GuestPreferenceCategoryEnum.DIETARY);
    expect(found.getSource()).toBe(GuestPreferenceSourceEnum.CUSTOM);
    expect(found.getIsActive()).toBe(true);
  });

  it('updates in place and keeps the id', async () => {
    const id = await repo.save(customItem('Gluten free'));
    const loaded = (await repo.findById(id))!;

    loaded.update('Lactose free', GuestPreferenceCategoryEnum.OTHER);
    loaded.deactivate();
    expect(await repo.save(loaded)).toBe(id);

    expect(await prisma.guest_preference_catalog_items.count()).toBe(1);
    const reloaded = (await repo.findById(id))!;
    expect(reloaded.getLabel()).toBe('Lactose free');
    expect(reloaded.getCategory()).toBe(GuestPreferenceCategoryEnum.OTHER);
    expect(reloaded.getIsActive()).toBe(false);
  });

  it('lists a tenants items oldest first and excludes other tenants', async () => {
    await repo.save(customItem('First'));
    await repo.save(customItem('Second'));

    const other = await seedTenant({ name: 'Andina' });
    await prisma.guest_preference_catalog_items.create({
      data: {
        tenant_id: other.id,
        category: 'DIETARY',
        source: 'CUSTOM',
        label: 'Theirs',
      },
    });

    const items = await repo.findByTenant(TenantId.createFromString(tenantId));
    expect(items.map((item) => item.getLabel())).toEqual(['First', 'Second']);
  });

  it('hard-deletes', async () => {
    const id = await repo.save(customItem('Gluten free'));
    await repo.delete(id);

    expect(await repo.findById(id)).toBeNull();
    expect(await prisma.guest_preference_catalog_items.count()).toBe(0);
  });
});
