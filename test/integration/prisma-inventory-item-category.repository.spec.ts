import { PrismaInventoryItemCategoryRepository } from '@/infrastructure/persistence/repositories/prisma-inventory-item-category.repository';
import { InventoryItemCategory } from '@/domain/inventory/entities/inventory-item-category.entity';
import { InventoryItemCategoryId } from '@/domain/inventory/value-objects/inventory-item-category-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedTenant } from './fixtures';

describe('PrismaInventoryItemCategoryRepository', () => {
  const repo = new PrismaInventoryItemCategoryRepository(prisma);

  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newCategory = (name: string) =>
    InventoryItemCategory.create({
      tenantId: TenantId.createFromString(tenantId),
      name,
      description: 'Cleaning supplies',
    });

  it('round-trips and updates in place', async () => {
    const id = await repo.save(newCategory('Limpieza'));

    const found = (await repo.findById(InventoryItemCategoryId.create(id)))!;
    expect(found.getName()).toBe('Limpieza');
    expect(found.getDescription()).toBe('Cleaning supplies');

    expect(await repo.save(found)).toBe(id);
    expect(await prisma.inventory_item_categories.count()).toBe(1);
  });

  it('matches the whole name case-insensitively, not a substring', async () => {
    await repo.save(newCategory('Limpieza'));
    const tenant = TenantId.createFromString(tenantId);

    expect(await repo.findByName(tenant, ' limpieza ')).not.toBeNull();
    expect(await repo.findByName(tenant, 'LIMPIEZA')).not.toBeNull();
    expect(await repo.findByName(tenant, 'Limp')).toBeNull();
  });

  it('lists a tenants categories alphabetically', async () => {
    await repo.save(newCategory('Zeta'));
    await repo.save(newCategory('Alpha'));

    expect(
      (
        await repo.findByTenantId(TenantId.createFromString(tenantId))
      ).map((category) => category.getName()),
    ).toEqual(['Alpha', 'Zeta']);
  });

  it('rejects a duplicate name within the tenant', async () => {
    await repo.save(newCategory('Limpieza'));
    await expect(repo.save(newCategory('Limpieza'))).rejects.toThrow();
  });
});
