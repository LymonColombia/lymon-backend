export class GetUnitWithExternalIdsByIdQuery {
  constructor(
    public readonly unitId: string,
    public readonly tenantId: string,
  ) {}
}
