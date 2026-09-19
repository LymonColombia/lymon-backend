import { InventoryItemCategory } from '@/domain/inventory/entities/inventory-item-category.entity';
import { InventoryItemCategoryId } from '@/domain/inventory/value-objects/inventory-item-category-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export interface InventoryItemCategoryRepository {
  save(category: InventoryItemCategory): Promise<string>;
  findById(id: InventoryItemCategoryId): Promise<InventoryItemCategory | null>;
  findByName(
    tenantId: TenantId,
    name: string,
  ): Promise<InventoryItemCategory | null>;
  findByTenantId(tenantId: TenantId): Promise<InventoryItemCategory[]>;
}

export const INVENTORY_ITEM_CATEGORY_REPOSITORY =
  'INVENTORY_ITEM_CATEGORY_REPOSITORY';
