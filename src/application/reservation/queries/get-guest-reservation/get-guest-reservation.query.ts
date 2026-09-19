export class GetGuestReservationQuery {
  constructor(
    public readonly reservationId: string,
    public readonly guestAccountId: string,
  ) {}
}
