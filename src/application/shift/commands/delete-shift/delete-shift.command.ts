export class DeleteShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly tenantId: string,
    public readonly actorId?: string,
    public readonly actorEmail?: string,
  ) {}
}
