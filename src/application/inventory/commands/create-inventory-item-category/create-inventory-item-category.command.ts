export class CreateInventoryItemCategoryCommand {
  constructor(
    public readonly tenantId: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
