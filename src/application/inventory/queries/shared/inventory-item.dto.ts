export class InventoryItemDto {
  constructor(
    public readonly id: string,
    public readonly sku: string,
    public readonly name: string,
    public readonly categoryId: string,
    public readonly unit: string,
    public readonly minStock: number,
    public readonly currentStock: number,
    public readonly lowStock: boolean,
    public readonly supplierId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export const toInventoryItemDto = (item: {
  getId(): { toString(): string } | null;
  getSku(): string;
  getName(): string;
  getCategoryId(): { toString(): string };
  getUnit(): string;
  getMinStock(): number;
  getCurrentStock(): number;
  isLowStock(): boolean;
  getSupplierId(): { toString(): string } | null;
  getCreatedAt(): Date;
  getUpdatedAt(): Date;
}): InventoryItemDto =>
  new InventoryItemDto(
    item.getId()?.toString() ?? '',
    item.getSku(),
    item.getName(),
    item.getCategoryId().toString(),
    item.getUnit(),
    item.getMinStock(),
    item.getCurrentStock(),
    item.isLowStock(),
    item.getSupplierId()?.toString() ?? null,
    item.getCreatedAt(),
    item.getUpdatedAt(),
  );
