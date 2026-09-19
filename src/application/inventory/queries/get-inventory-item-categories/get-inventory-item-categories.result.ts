export interface InventoryItemCategoryListItemDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export class GetInventoryItemCategoriesResult {
  constructor(
    public readonly categories: InventoryItemCategoryListItemDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
