import { InventoryItem } from '@/domain/inventory/entities/inventory-item.entity';
import { InventoryItemId } from '@/domain/inventory/value-objects/inventory-item-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';

export const INVENTORY_ITEM_REPOSITORY = 'INVENTORY_ITEM_REPOSITORY';

export interface InventoryItemRepository {
  save(
    item: InventoryItem,
    transactionContext?: TransactionContextData,
  ): Promise<string>;
  findById(id: InventoryItemId): Promise<InventoryItem | null>;
  findByPropertyId(
    tenantId: TenantId,
    propertyId: PropertyId,
  ): Promise<InventoryItem[]>;
  findLowStockByPropertyId(
    tenantId: TenantId,
    propertyId: PropertyId,
  ): Promise<InventoryItem[]>;
  findByPropertyIdAndSku(
    tenantId: TenantId,
    propertyId: PropertyId,
    sku: string,
  ): Promise<InventoryItem | null>;
  findBySupplierId(
    tenantId: TenantId,
    supplierId: SupplierId,
  ): Promise<InventoryItem[]>;
  delete(id: InventoryItemId): Promise<void>;
}
