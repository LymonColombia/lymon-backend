export class GetConversationsByTenantQuery {
  constructor(
    public readonly tenantId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly channel?: string,
    public readonly status?: string,
    public readonly unreadOnly?: boolean,
  ) {}
}
