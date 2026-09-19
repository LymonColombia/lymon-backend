export class ArchiveConversationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly conversationId: string,
  ) {}
}
