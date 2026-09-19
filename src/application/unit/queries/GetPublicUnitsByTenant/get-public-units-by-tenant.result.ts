export class PublicBedDto {
  constructor(
    public readonly type: string,
    public readonly count: number,
  ) {}
}

export class PublicBedroomDto {
  constructor(
    public readonly roomName: string,
    public readonly beds: PublicBedDto[],
  ) {}
}

export class PublicUnitDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly maxGuests: number,
    public readonly standardGuests: number,
    public readonly bedrooms: PublicBedroomDto[],
    public readonly bathroomsCount: number,
    public readonly isShared: boolean,
    public readonly amenities: string[],
    public readonly pricePerNight: number,
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly rating: number | null,
    public readonly mediaUrls: string[],
  ) {}
}

export class GetPublicUnitsByTenantResult {
  constructor(
    public readonly units: PublicUnitDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
