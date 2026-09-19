export class InventoryMovementId {
  private constructor(private readonly value: string) {}

  static create(value: string): InventoryMovementId {
    if (!value || value.trim() === '') {
      throw new Error('InventoryMovementId cannot be empty');
    }
    return new InventoryMovementId(value);
  }

  toString(): string {
    return this.value;
  }
}
