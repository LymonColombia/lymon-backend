import { InventoryItemDto } from '@/application/inventory/queries/shared/inventory-item.dto';

export class GetLowStockItemsByPropertyResult {
  constructor(public readonly items: InventoryItemDto[]) {}
}
