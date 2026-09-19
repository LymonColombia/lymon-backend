export class UnitRatingDto {
  constructor(
    public readonly id: string,
    public readonly unitId: string,
    public readonly guestId: string,
    public readonly guestName: string,
    public readonly reservationId: string,
    public readonly rate: number,
    public readonly message: string | null,
    public readonly createdAt: Date,
  ) {}
}

export class GetUnitRatingsResult {
  constructor(
    public readonly ratings: UnitRatingDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
