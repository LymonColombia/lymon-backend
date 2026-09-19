export class RecordInventoryMovementResult {
  constructor(
    public readonly movementId: string,
    public readonly itemId: string,
    public readonly currentStock: number,
  ) {}
}
