import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';

export class GetGuestReservationsQuery {
  constructor(
    public readonly guestAccountId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly statuses?: ReservationStatusEnum[],
    public readonly fromDate?: Date,
    public readonly toDate?: Date,
    public readonly sortBy: 'date' | 'status' | 'createdAt' = 'date',
    public readonly sortOrder: 'asc' | 'desc' = 'desc',
  ) {}
}
