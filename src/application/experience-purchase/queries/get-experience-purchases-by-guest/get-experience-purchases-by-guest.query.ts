export class GetExperiencePurchasesByGuestQuery {
  constructor(
    readonly guestAccountId: string,
    readonly tenantId: string,
    readonly page: number = 1,
    readonly limit: number = 20,
  ) {}
}
