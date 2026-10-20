import { ReservationSourceEnum } from '@/domain/reservation/value-objects/reservation-source.vo';

export class CreateReservationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly unitId: string,
    public readonly guestId: string,
    public readonly checkIn: Date,
    public readonly checkOut: Date,
    public readonly guestsCount: number,
    public readonly notes: string | null,
    public readonly source: ReservationSourceEnum,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
