export class GetConversationsByGuestIdQuery {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
  ) {}
}
