import { InventoryItem } from '@/domain/inventory/entities/inventory-item.entity';
import { InventoryItemId } from '@/domain/inventory/value-objects/inventory-item-id.vo';
import { InventoryItemCategoryId } from '@/domain/inventory/value-objects/inventory-item-category-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { PROPERTY_FIXTURE_DEFAULTS } from '@test/shared/fixtures/property.fixture';
import { TENANT_FIXTURE_DEFAULTS } from '@test/shared/fixtures/tenant.fixture';
import { INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS } from '@test/shared/fixtures/inventory-item-category.fixture';

export const INVENTORY_ITEM_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
  tenantId: TENANT_FIXTURE_DEFAULTS.id,
  propertyId: PROPERTY_FIXTURE_DEFAULTS.id,
  sku: 'SKU-001',
  name: 'Toalla',
  categoryId: INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS.id,
  unit: 'unidad',
  minStock: 5,
  currentStock: 20,
  supplierId: null,
};

export function makeInventoryItem(
  overrides?: Partial<{
    id: string;
    tenantId: string;
    propertyId: string;
    sku: string;
    name: string;
    categoryId: string;
    unit: string;
    minStock: number;
    currentStock: number;
    supplierId: string | null;
  }>,
): InventoryItem {
  const merged = { ...INVENTORY_ITEM_FIXTURE_DEFAULTS, ...overrides };

  return InventoryItem.reconstitute({
    identity: {
      id: InventoryItemId.create(merged.id),
      tenantId: TenantId.createFromString(merged.tenantId),
      propertyId: PropertyId.create(merged.propertyId),
    },
    profile: {
      sku: merged.sku,
      name: merged.name,
      categoryId: InventoryItemCategoryId.create(merged.categoryId),
      unit: merged.unit,
      minStock: merged.minStock,
      currentStock: merged.currentStock,
      supplierId: merged.supplierId
        ? SupplierId.create(merged.supplierId)
        : null,
    },
    timestamps: {
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}
