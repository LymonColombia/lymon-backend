export class GuestRatingDto {
  constructor(
    public readonly id: string,
    public readonly unitId: string,
    public readonly unitName: string,
    public readonly rate: number,
    public readonly message: string | null,
    public readonly createdAt: Date,
  ) {}
}

export class GetGuestRatingsResult {
  constructor(
    public readonly ratings: GuestRatingDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
    public readonly averageRating: number | null,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
