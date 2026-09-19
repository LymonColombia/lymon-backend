import { InventoryItemDto } from '@/application/inventory/queries/shared/inventory-item.dto';

export class GetInventoryItemsByPropertyResult {
  constructor(
    public readonly items: InventoryItemDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
