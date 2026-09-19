export class CancelGuestReservationCommand {
  constructor(
    public readonly reservationId: string,
    public readonly guestAccountId: string,
    public readonly reason: string | null,
  ) {}
}
