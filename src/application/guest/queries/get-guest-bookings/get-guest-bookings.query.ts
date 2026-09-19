export class GetGuestBookingsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly sortBy: 'checkIn' | 'createdAt' = 'checkIn',
    public readonly sortDirection: 'asc' | 'desc' = 'desc',
  ) {}
}
