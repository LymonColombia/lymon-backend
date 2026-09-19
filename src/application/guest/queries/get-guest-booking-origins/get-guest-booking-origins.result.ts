export interface BookingOriginDto {
  source: string;
  count: number;
  percentage: number;
}

export class GetGuestBookingOriginsResult {
  constructor(
    public readonly total: number,
    public readonly sources: BookingOriginDto[],
  ) {}
}
