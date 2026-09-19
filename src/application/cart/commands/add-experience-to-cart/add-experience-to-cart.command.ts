export class AddExperienceToCartCommand {
  constructor(
    readonly guestAccountId: string,
    readonly tenantId: string,
    readonly experienceId: string,
    readonly quantity: number,
    readonly selectedDate?: Date | null,
    readonly reservationId?: string | null,
    readonly actorEmail?: string,
  ) {}
}
