export class InventoryItemId {
  private constructor(private readonly value: string) {}

  static create(value: string): InventoryItemId {
    if (!value || value.trim() === '') {
      throw new Error('InventoryItemId cannot be empty');
    }
    return new InventoryItemId(value);
  }

  toString(): string {
    return this.value;
  }
}
