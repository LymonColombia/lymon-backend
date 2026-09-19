export class GetPropertyByIdQuery {
  constructor(
    public readonly propertyId: string,
    public readonly tenantId: string,
  ) {}
}
