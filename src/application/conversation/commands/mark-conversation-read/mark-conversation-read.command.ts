export class MarkConversationReadCommand {
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
  ) {}
}
