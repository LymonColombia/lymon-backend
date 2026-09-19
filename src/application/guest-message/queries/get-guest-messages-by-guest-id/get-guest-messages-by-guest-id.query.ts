export class GetGuestMessagesByGuestIdQuery {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}
