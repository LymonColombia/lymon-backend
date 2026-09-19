export class DeleteInventoryItemCommand {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly itemId: string,
  ) {}
}
