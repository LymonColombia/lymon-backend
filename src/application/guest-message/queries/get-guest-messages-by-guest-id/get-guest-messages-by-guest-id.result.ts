export class GuestMessageDto {
  id: string;
  guestId: string;
  channel: string;
  direction: string;
  status: string;
  preview: string;
  sentBy: { actorId: string; actorEmail: string };
  providerMessageId: string | null;
  attachments: { url: string; name: string; type?: string }[];
  createdAt: Date;
}

export class GetGuestMessagesByGuestIdResult {
  constructor(
    public readonly items: GuestMessageDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
