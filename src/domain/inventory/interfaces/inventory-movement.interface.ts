import { InventoryMovementId } from '@/domain/inventory/value-objects/inventory-movement-id.vo';
import { InventoryMovementType } from '@/domain/inventory/value-objects/inventory-movement-type.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { InventoryItemId } from '@/domain/inventory/value-objects/inventory-item-id.vo';

export interface IInventoryMovementData {
  id: InventoryMovementId;
  tenantId: TenantId;
  propertyId: PropertyId;
  itemId: InventoryItemId;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  reference: string | null;
  actorId: string;
  actorEmail: string;
  createdAt: Date;
}
