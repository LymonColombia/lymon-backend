export class GetReservationsByGuestIdQuery {
  constructor(
    public readonly guestAccountId: string,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
