export class DeleteCustomCatalogItemCommand {
  constructor(
    public readonly tenantId: string,
    public readonly activePlan: string,
    public readonly itemId: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
