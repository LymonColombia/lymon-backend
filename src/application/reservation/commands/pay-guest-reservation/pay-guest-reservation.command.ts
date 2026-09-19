export class PayGuestReservationCommand {
  constructor(
    readonly reservationId: string,
    readonly guestAccountId: string,
    readonly tenantId: string,
    readonly actorId: string,
    readonly actorEmail: string,
  ) {}
}
