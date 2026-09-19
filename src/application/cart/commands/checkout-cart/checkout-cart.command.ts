export class CheckoutCartCommand {
  constructor(
    readonly guestAccountId: string,
    readonly actorId: string,
    readonly actorEmail: string,
    readonly reservationItem?: {
      tenantId: string;
      propertyId: string;
      unitId: string;
      checkIn: Date;
      checkOut: Date;
      guestsCount: number;
      pricePerNight: number;
      notes: string | null;
    },
    readonly experienceItems?: Array<{
      tenantId: string;
      experienceId: string;
      quantity: number;
      selectedDate: Date | null;
    }>,
  ) {}
}
