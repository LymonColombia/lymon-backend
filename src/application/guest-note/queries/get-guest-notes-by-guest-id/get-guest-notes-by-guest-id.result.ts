export interface GuestNoteDto {
  id: string;
  guestId: string;
  note: string;
  type: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GetGuestNotesByGuestIdResult {
  constructor(
    public readonly items: GuestNoteDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
