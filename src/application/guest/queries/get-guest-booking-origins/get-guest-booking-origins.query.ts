export class GetGuestBookingOriginsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
  ) {}
}
