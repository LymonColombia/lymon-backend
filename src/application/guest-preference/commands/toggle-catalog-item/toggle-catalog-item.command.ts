export class ToggleCatalogItemCommand {
  constructor(
    public readonly tenantId: string,
    public readonly itemId: string,
    public readonly activate: boolean,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
