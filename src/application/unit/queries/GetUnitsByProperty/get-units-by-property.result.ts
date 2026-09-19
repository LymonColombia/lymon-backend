export class UnitDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly inventoryCount: number,
    public readonly maxGuests: number,
    public readonly standardGuests: number,
    public readonly bathroomsCount: number,
    public readonly isShared: boolean,
    public readonly amenities: string[],
    public readonly pricePerNight: number,
    public readonly createdAt: Date,
    public readonly rating: number | null,
    public readonly mediaUrls: string[],
  ) {}
}

export class GetUnitsByPropertyResult {
  constructor(
    public readonly units: UnitDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
