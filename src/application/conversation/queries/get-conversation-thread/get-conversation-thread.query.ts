export class GetConversationThreadQuery {
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
  ) {}
}
