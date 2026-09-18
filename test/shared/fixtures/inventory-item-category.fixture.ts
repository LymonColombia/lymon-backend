import { InventoryItemCategory } from '@/domain/inventory/entities/inventory-item-category.entity';
import { InventoryItemCategoryId } from '@/domain/inventory/value-objects/inventory-item-category-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export const INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS = {
  id: '6650a1b2-c3d4-e5f6-a7b8-c9d000000000',
  tenantId: '5540a0b1-c2d3-e4f5-a6b7-c8d900000000',
  name: 'Limpieza',
  description: 'Productos de limpieza general',
};

export function makeInventoryItemCategory(
  overrides?: Partial<typeof INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS>,
): InventoryItemCategory {
  const merged = { ...INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS, ...overrides };
  return InventoryItemCategory.reconstitute({
    id: InventoryItemCategoryId.create(merged.id),
    tenantId: TenantId.createFromString(merged.tenantId),
    name: merged.name,
    description: merged.description,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  });
}
