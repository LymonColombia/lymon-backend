export class CreateInventoryItemResult {
  constructor(
    public readonly itemId: string,
    public readonly currentStock: number,
  ) {}
}
