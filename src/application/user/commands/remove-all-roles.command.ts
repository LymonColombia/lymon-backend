export class RemoveAllRolesCommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId?: string,
    public readonly actorId?: string,
    public readonly actorEmail?: string,
  ) {}
}
