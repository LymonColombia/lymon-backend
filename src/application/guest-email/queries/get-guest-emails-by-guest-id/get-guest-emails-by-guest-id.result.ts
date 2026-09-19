export class GuestEmailDto {
  id: string;
  guestId: string;
  subject: string;
  status: string;
  messageId: string | null;
  attachments: {
    url: string;
    name: string;
    type?: string;
  }[];
  sentById: string | null;
  createdAt: Date;
}

export class GetGuestEmailsByGuestIdResult {
  constructor(
    public readonly items: GuestEmailDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
