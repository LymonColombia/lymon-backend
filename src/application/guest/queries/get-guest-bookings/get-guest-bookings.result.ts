export interface GuestBookingDto {
  id: string;
  propertyId: string;
  propertyName: string | null;
  unitId: string;
  unitName: string | null;
  checkIn: Date;
  checkOut: Date;
  status: string;
  totalAmount: number;
  source: string;
  createdAt: Date;
  nights: number;
  guestsCount: number;
  notes: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  checkInActualAt: Date | null;
  checkOutActualAt: Date | null;
}

export class GetGuestBookingsResult {
  constructor(
    public readonly items: GuestBookingDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
