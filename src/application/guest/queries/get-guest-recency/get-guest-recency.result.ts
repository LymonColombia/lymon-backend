export class GetGuestRecencyResult {
  constructor(
    public readonly lastStayAt: string | null,
    public readonly daysSinceLastStay: number | null,
  ) {}
}
