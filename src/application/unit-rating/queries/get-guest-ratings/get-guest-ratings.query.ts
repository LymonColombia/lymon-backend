export class GetGuestRatingsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
