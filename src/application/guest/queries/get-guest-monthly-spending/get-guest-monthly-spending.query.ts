export class GetGuestMonthlySpendingQuery {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
  ) {}
}
