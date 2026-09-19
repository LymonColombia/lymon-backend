export class GetGuestMessageByIdQuery {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly messageId: string,
  ) {}
}
