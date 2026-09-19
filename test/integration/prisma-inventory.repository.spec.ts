import { PrismaInventoryItemRepository } from '@/infrastructure/persistence/repositories/prisma-inventory-item.repository';
import { PrismaInventoryMovementRepository } from '@/infrastructure/persistence/repositories/prisma-inventory-movement.repository';
import { PrismaInventoryItemCategoryRepository } from '@/infrastructure/persistence/repositories/prisma-inventory-item-category.repository';
import { PrismaSupplierRepository } from '@/infrastructure/persistence/repositories/prisma-supplier.repository';
import { InventoryItem } from '@/domain/inventory/entities/inventory-item.entity';
import { InventoryMovement } from '@/domain/inventory/entities/inventory-movement.entity';
import { InventoryItemCategory } from '@/domain/inventory/entities/inventory-item-category.entity';
import { Supplier } from '@/domain/inventory/entities/supplier.entity';
import { InventoryItemId } from '@/domain/inventory/value-objects/inventory-item-id.vo';
import { InventoryItemCategoryId } from '@/domain/inventory/value-objects/inventory-item-category-id.vo';
import { InventoryMovementType } from '@/domain/inventory/value-objects/inventory-movement-type.vo';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedProperty, seedTenant } from './fixtures';

describe('Prisma inventory repositories', () => {
  const items = new PrismaInventoryItemRepository(prisma);
  const movements = new PrismaInventoryMovementRepository(prisma);
  const categories = new PrismaInventoryItemCategoryRepository(prisma);
  const suppliers = new PrismaSupplierRepository(prisma);

  let tenantId: string;
  let propertyId: string;
  let categoryId: string;
  let supplierId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    propertyId = (await seedProperty(tenantId)).id;
    categoryId = await categories.save(
      InventoryItemCategory.create({
        tenantId: TenantId.createFromString(tenantId),
        name: 'Limpieza',
      }),
    );
    supplierId = await suppliers.save(
      Supplier.create({
        tenantId: TenantId.createFromString(tenantId),
        name: 'Aseo Total',
        contactEmail: 'ventas@aseo.com',
        contactPhone: '+573001112233',
        country: 'CO',
        city: 'Bogota',
        nit: 'NIT-1',
      }),
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newItem = (
    sku: string,
    overrides: { minStock?: number; initialStock?: number } = {},
  ) =>
    InventoryItem.create({
      tenantId: TenantId.createFromString(tenantId),
      propertyId: PropertyId.create(propertyId),
      sku,
      name: `Item ${sku}`,
      categoryId: InventoryItemCategoryId.create(categoryId),
      unit: 'box',
      minStock: overrides.minStock ?? 5,
      initialStock: overrides.initialStock ?? 10,
      supplierId: SupplierId.create(supplierId),
    });

  it('round-trips numeric stock as numbers, not Decimal objects', async () => {
    const id = await items.save(newItem('SKU-1', { minStock: 2.5, initialStock: 7.25 }));

    const found = (await items.findById(InventoryItemId.create(id)))!;
    expect(found.getMinStock()).toBe(2.5);
    expect(found.getCurrentStock()).toBe(7.25);
    expect(found.getSupplierId()!.toString()).toBe(supplierId);
    expect(found.getUnit()).toBe('box');
  });

  it('finds low stock by comparing the two columns', async () => {
    await items.save(newItem('LOW-1', { minStock: 10, initialStock: 3 }));
    await items.save(newItem('LOW-2', { minStock: 10, initialStock: 10 }));
    await items.save(newItem('OK-1', { minStock: 1, initialStock: 50 }));

    const low = await items.findLowStockByPropertyId(
      TenantId.createFromString(tenantId),
      PropertyId.create(propertyId),
    );

    // current_stock <= min_stock, lowest first
    expect(low.map((item) => item.getSku())).toEqual(['LOW-1', 'LOW-2']);
  });

  it('finds by SKU and supplier, and frees the SKU after a soft delete', async () => {
    const id = await items.save(newItem('SKU-1'));
    const tenant = TenantId.createFromString(tenantId);
    const property = PropertyId.create(propertyId);

    expect(await items.findByPropertyIdAndSku(tenant, property, ' SKU-1 ')).not.toBeNull();
    expect(
      await items.findBySupplierId(tenant, SupplierId.create(supplierId)),
    ).toHaveLength(1);

    await items.delete(InventoryItemId.create(id));

    expect(await items.findById(InventoryItemId.create(id))).toBeNull();
    expect(await items.findByPropertyId(tenant, property)).toEqual([]);
    expect(
      await items.findLowStockByPropertyId(tenant, property),
    ).toEqual([]);
    await expect(items.save(newItem('SKU-1'))).resolves.toBeDefined();
  });

  it('records movements and pages them newest first', async () => {
    const itemId = await items.save(newItem('SKU-1'));

    for (const reason of ['restock', 'consumption', 'audit']) {
      await movements.save(
        InventoryMovement.create({
          tenantId: TenantId.createFromString(tenantId),
          propertyId: PropertyId.create(propertyId),
          itemId: InventoryItemId.create(itemId),
          type: InventoryMovementType.IN,
          quantity: 1.5,
          reason,
          actorId: '00000000-0000-4000-8000-000000000001',
          actorEmail: 'staff@costa.com',
        }),
      );
    }

    const tenant = TenantId.createFromString(tenantId);
    const byItem = await movements.findByItemId(
      tenant,
      InventoryItemId.create(itemId),
      1,
      2,
    );
    expect(byItem).toHaveLength(2);
    expect(byItem[0].getQuantity()).toBe(1.5);

    expect(
      await movements.findByPropertyId(tenant, PropertyId.create(propertyId), 1, 10),
    ).toHaveLength(3);
    expect(
      await movements.findByPropertyId(tenant, PropertyId.create(propertyId), 2, 2),
    ).toHaveLength(1);
  });
});
