export class DeleteUnitCommand {
  constructor(
    public readonly tenantId: string,
    public readonly unitId: string,
    public readonly actorId?: string,
    public readonly actorEmail?: string,
  ) {}
}
