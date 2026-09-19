export class GetExperiencePurchaseByIdQuery {
  constructor(
    readonly purchaseId: string,
    readonly guestAccountId: string,
  ) {}
}
