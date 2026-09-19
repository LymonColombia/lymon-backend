export class ListCatalogItemsByTenantQuery {
  constructor(
    public readonly tenantId: string,
    public readonly includeInactive: boolean = false,
  ) {}
}
