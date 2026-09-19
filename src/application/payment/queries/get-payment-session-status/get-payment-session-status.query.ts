export class GetPaymentSessionStatusQuery {
  constructor(
    public readonly guestAccountId: string,
    public readonly reference: string,
  ) {}
}
