import { InventoryMovement } from '@/domain/inventory/entities/inventory-movement.entity';
import { InventoryItemId } from '@/domain/inventory/value-objects/inventory-item-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export const INVENTORY_MOVEMENT_REPOSITORY = 'INVENTORY_MOVEMENT_REPOSITORY';

export interface InventoryMovementRepository {
  save(
    movement: InventoryMovement,
    transactionContext?: TransactionContextData,
  ): Promise<string>;
  findByPropertyId(
    tenantId: TenantId,
    propertyId: PropertyId,
    page: number,
    limit: number,
  ): Promise<InventoryMovement[]>;
  findByItemId(
    tenantId: TenantId,
    itemId: InventoryItemId,
    page: number,
    limit: number,
  ): Promise<InventoryMovement[]>;
}
