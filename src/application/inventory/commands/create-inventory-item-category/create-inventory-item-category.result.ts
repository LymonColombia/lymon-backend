export class CreateInventoryItemCategoryResult {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
  ) {}
}
