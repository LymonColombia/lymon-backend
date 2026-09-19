export class InventoryItemCategoryId {
  private constructor(private readonly value: string) {}

  static create(value: string): InventoryItemCategoryId {
    if (!value || value.trim() === '') {
      throw new Error('InventoryItemCategoryId cannot be empty');
    }
    return new InventoryItemCategoryId(value);
  }

  toString(): string {
    return this.value;
  }
}
