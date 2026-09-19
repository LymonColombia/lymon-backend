export class CreateUnitRatingCommand {
  constructor(
    public readonly actorId: string,
    public readonly actorEmail: string,
    public readonly reservationId: string,
    public readonly rate: number,
    public readonly message: string | null,
  ) {}
}
