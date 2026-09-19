export class SetCartReservationCommand {
  constructor(
    readonly guestAccountId: string,
    readonly tenantId: string,
    readonly propertyId: string,
    readonly unitId: string,
    readonly checkIn: Date,
    readonly checkOut: Date,
    readonly guestsCount: number,
    readonly pricePerNight: number,
    readonly notes: string | null,
    readonly actorEmail: string,
  ) {}
}
