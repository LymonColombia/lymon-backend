export class PropertyDto {
  constructor(
    public readonly id: string,
    public readonly slug: string,
    public readonly name: string,
    public readonly description: string,
    public readonly propertyType: string,
    public readonly address: string,
    public readonly city: string,
    public readonly createdAt: Date,
    public readonly imageUrl: string | null,
  ) {}
}

export class GetPropertiesByTenantResult {
  constructor(
    public readonly properties: PropertyDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
