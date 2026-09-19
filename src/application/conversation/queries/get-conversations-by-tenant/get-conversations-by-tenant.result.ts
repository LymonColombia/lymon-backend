export class ConversationSummaryDto {
  constructor(
    public readonly id: string,
    public readonly guestId: string,
    public readonly reservationId: string | null,
    public readonly channels: string[],
    public readonly subject: string,
    public readonly lastMessageAt: Date,
    public readonly lastMessagePreview: string,
    public readonly unreadCountForStaff: number,
    public readonly unreadCountForGuest: number,
    public readonly status: string,
    public readonly createdAt: Date,
  ) {}
}

export class GetConversationsByTenantResult {
  constructor(
    public readonly items: ConversationSummaryDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
